const Discord = require("discord.js");
const { safeSendMessage } = require("../utils/messageUtils"); // Make sure this utility is correctly set up
const path = require("path");
const uploadTo0x0St = require("../services/uploadTo0x0");
const axios = require("axios");
const fs = require("fs");
const { spawn } = require("child_process");
const fetch = require("node-fetch");
const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  name: "sign-app-private", // This is the command name that will be used to call the command
  description: "Create a singing channel and manage file uploads",
  async execute(message, args) {
    const categoryID = "1169861472369774653"; // Replace with your category ID
    const channelName = `singing-${message.author.username}`;
    const privChannel = await message.guild.channels
      .create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryID,
        permissionOverwrites: [
          {
            id: message.author.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: message.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      })
      .then(async (channel) => {
        await channel.send(
          `<@${message.author.id}>, Welcome to your signing channel! Please upload all of your files below while the bot asks! \n All of your files are fully secure and get deleted right after they your app is signed.`
        );

        // Collectors for each file type
        const filter = (m) => m.author.id === message.author.id;
        message.reply("<@" + message.author.id + ">, Please upload all of your files at: " + "<#" + channel.id + ">");

        // First file collector for .ipa
        let ipaFile = null;
        while (!ipaFile) {
          ipaFile = await handleFileUpload(channel, ".ipa", message);
          if (ipaFile) {
            break; // Exit the loop if the correct file is received
          }
        }

        let p12File = null;
        while (!p12File) {
          p12File = await handleFileUpload(channel, ".p12", message);
          if (p12File) {
            break;
          }
        }

        let mpFile = null;
        while (!mpFile) {
          mpFile = await handleFileUpload(channel, ".mobileprovision", message);
          if (mpFile) {
            break;
          }
        }

        // Start the password collector only after the .mobileprovision file is successfully uploaded
        let password = null;
        while (!password) {
          password = await handlePasswordInput(channel, message);
          if (password) {
            // Process the received password as needed
            break; // Exit the loop if the password is received
          } else {
            // Optionally handle the case where no password is provided
            // For example, you can send a message to the user or retry
          }
        }

        console.log("IPA file: " + (ipaFile ? ipaFile : "Not uploaded"));
        console.log("P12 file: " + (p12File ? p12File : "Not uploaded"));
        console.log("MP file: " + (mpFile ? mpFile : "Not uploaded"));
        console.log("Password: " + (password ? password : "Not provided"));

        channel.send(
          "<@" +
            message.author.id +
            ">, Please wait while we sign your app. This may take a minute..."
        );

        const outputFileName = "Signed_" + path.basename(ipaFile);
        const outputIPAPath = path.join(__dirname, "../savedFiles", outputFileName);

        await signIPA(
          ipaFile,
          outputIPAPath,
          p12File,
          mpFile,
          password,
          channel,
          message.author.id,
        );
      });
  },
};

// Function to handle the file upload process
const handleFileUpload = async (channel, fileType, message) => {
  return new Promise((resolve) => {
    const askForFile = () => {
      channel.send(`Please upload the ${fileType} file:`);
    };

    askForFile();

    const filter = (m) =>
      m.author.id === message.author.id && m.attachments.size > 0;
    const collector = channel.createMessageCollector({ filter, time: 60000 });

    collector.on("collect", async (m) => {
      const attachment = m.attachments.first();
      if (attachment && attachment.name.endsWith(fileType)) {
        // Fetch the attachment data using the URL
        const response = await fetch(attachment.url);
        const buffer = await response.buffer(); // Use buffer() method to get the data

        // Define the save path (adjust folder path as necessary)
        const savePath = path.join(__dirname, "../savedFiles", attachment.name);

        const dir = path.dirname(savePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file to the filesystem
        fs.writeFileSync(savePath, buffer);
        collector.stop();
        resolve(savePath); // Resolve with the file path
      } else {
        channel.send(`This is not a ${fileType} file. Please try again.`);
        askForFile();
      }
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        channel.send(`No ${fileType} file uploaded.`);
        resolve(null);
      }
    });
  });
};

const handlePasswordInput = async (channel, message) => {
  return new Promise((resolve) => {
    channel.send("Please enter the password for the p12 file:");

    // Delay to prevent immediate collection of a previous message
    setTimeout(() => {
      const passwordFilter = (m) =>
        m.author.id === message.author.id && m.attachments.size === 0;

      const passwordCollector = channel.createMessageCollector({
        passwordFilter,
        max: 1,
        time: 300000,
      });

      passwordCollector.on("collect", (m) => {
        console.log("Password received and noted.");
        resolve(m.content); // Resolves with the entered password
      });

      passwordCollector.on("end", (collected) => {
        if (collected.size === 0) {
          channel.send("No password provided.");
          resolve(null);
        }
      });
    }, 1000); // 1 second delay
  });
};

const signIPA = (
  inputIPAPath,
  outputIPAPath,
  p12Path,
  mobileProvPath,
  password,
  message,
  author,
) => {
  return new Promise((resolve, reject) => {
    console.log(`Signing IPA at path: ${inputIPAPath}`);
    console.log(`Expected output at path: ${outputIPAPath}`);

    const zsign = spawn("./zsign", [
      "-k",
      p12Path,
      "-m",
      mobileProvPath,
      "-p",
      password,
      "-o",
      outputIPAPath,
      inputIPAPath,
      message,
    ]);

    zsign.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    zsign.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    zsign.on("close", (code) => {
      console.log(`zsign process exited with code ${code}`);
      if (code === 0) {
        console.log("Signing completed successfully");
        fs.stat(outputIPAPath, (err, stats) => {
          if (err) {
            console.error(`Error stating signed IPA file: ${err}`);
            message.channel.send("Error: Could not find the signed IPA file.");
            reject(err);
          } else {
            console.log(`Signed IPA file size: ${stats.size} bytes`);
            const filenameWithoutExtension = path.parse(outputIPAPath).name;
            uploadTo0x0St(outputIPAPath, message, filenameWithoutExtension, author);

            // Cleanup
            if (fs.existsSync(inputIPAPath)) {
              fs.unlinkSync(inputIPAPath);
            }
            deleteAllFilesInFolder('./savedFiles');
            resolve(outputIPAPath);
          }
        });
      } else {
        message.channel.send(`Error: zsign process exited with code ${code}`);
        reject(new Error(`zsign process exited with code ${code}`));
      }
    });
  });
};

function deleteAllFilesInFolder(folderPath) {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error(`Error reading the folder: ${err}`);
      return;
    }

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      fs.unlink(filePath, err => {
        if (err) {
          console.error(`Error deleting file ${filePath}: ${err}`);
        } else {
          console.log(`Deleted file: ${filePath}`);
        }
      });
    }
  });
}