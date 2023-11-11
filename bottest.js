const {
    Client,
    GatewayIntentBits,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActivityType,
  } = require("discord.js");
  const fs = require("fs");
  const axios = require("axios");
  const path = require("path");
  const FormData = require("form-data");
  const { exec } = require("child_process");
  const { Octokit } = require("@octokit/rest");
  const archiver = require("archiver");
  const octokit = new Octokit({
    auth: `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`,
  });
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages,
    ],
  });
  
  const { spawn } = require("child_process");
  
  client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity("our communtiy repo! Type !upload", {
      type: ActivityType.Watching,
    });
  });
  
  // Define safeSendMessage at the top level so it can be used in all commands
  const safeSendMessage = async (channel, content) => {
    try {
      const sentMessage = await channel.send(content);
      return sentMessage; // Return the sent message object
    } catch (error) {
      if (error.code === 10003) {
        console.error("Attempted to send a message to a deleted channel.");
      } else {
        throw error;
      }
    }
  };
  
  const ticketCategoryID = "1169861472369774653"; // Replace with the actual category ID for tickets
  
  client.on("messageCreate", async (message) => {
    if (!message.content) return;
  
    if (message.content === "?help") {
      const helpEmbed = new EmbedBuilder()
        .setAuthor({
          name: "Help Command",
          iconURL: "https://pasteboard.co/99oWyOWqaaFE.png",
          url: "https://discord.gg/v24C6NdbTv",
        })
        .setTitle("Available Commands")
        .setDescription("Here is a list of available commands you can use:")
        .addFields(
          { name: "?help", value: "Takes you here!", inline: true },
          {
            name: "?upload",
            value: "Upload a repository to our community.",
            inline: true,
          },
          {
            name: "?view-repos",
            value: "Admin only, allows you to view the current repo data.",
            inline: true,
          },
          {
            name: "?delete-repos",
            value:
              "Admin only, allows you to delete a specific repo or all the repos.",
            inline: true,
          },
          {
            name: "?sign-app public-cert",
            value: "Allows you to sign an iOS app and return a signed IPA file.",
            inline: true,
          },
          {
            name: "?sign-app private-cert",
            value: "You can sign an app using your own certificate files.",
            inline: true,
          }
          // Add as many commands as you need
        )
        .setColor("#0b3880")
        .setFooter({ text: "Made with ❤️ by loyahdev." })
        .setTimestamp();
  
      // Send the embed to the same channel as the message
      const botMessage = await message.channel.send({ embeds: [helpEmbed] });
    } else if (message.content === "?upload") {
      const ticketName = `ticket-${message.author.tag.replace("#", "-")}`; // Ensure the ticket name is valid
  
      console.log(`Creating ticket channel with name: ${ticketName}`);
  
      const ticketChannel = await message.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: ticketCategoryID,
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
      });
  
      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Repo Upload",
          iconURL:
            "https://techcrunch.com/wp-content/uploads/2015/04/codecode.jpg?w=1390&crop=1",
          url: "https://docs.loyahdev.me",
        })
        .setDescription(
          `Welcome ${message.author}. Below please type the name of the repo you would like to add to the community. If you would like to cancel at any time just react below.`
        )
        .setColor("#3498db");
  
      const botMessage = await ticketChannel.send({ embeds: [embed] });
      botMessage.react("❌");
      ticketChannel.send(`<@${message.author.id}>`);
  
      // Set up a filter to only collect messages from the user who created the ticket
      const filter = (response) => {
        return response.author.id === message.author.id;
      };
  
      try {
        await safeSendMessage(
          ticketChannel,
          "Please provide the name of the repository:"
        );
        const collected = await ticketChannel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ["time"],
        });
        const userMessage = collected.first();
  
        let isValidUrl = false;
        let linkMessage;
  
        do {
          await safeSendMessage(
            ticketChannel,
            "Please provide the link to the repository:"
          );
          const linkCollected = await ticketChannel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
            errors: ["time"],
          });
          linkMessage = linkCollected.first();
  
          // Validate the repo link (checking if it's a valid URL)
          const urlRegex =
            /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
          if (urlRegex.test(linkMessage.content)) {
            isValidUrl = true;
            // Call your function with the repo link
            await processRepoLink(
              userMessage.content,
              linkMessage.content,
              linkMessage.channel
            );
          } else {
            await safeSendMessage(
              ticketChannel,
              "The provided text is not a valid URL. Please enter a valid URL."
            );
          }
        } while (!isValidUrl);
      } catch (error) {
        // If an error occurs, such as a timeout or any issue while sending the message, handle it here.
        console.log(
          "An error occurred while processing the upload command:",
          error
        );
  
        // Attempt to delete the channel safely, catching any errors.
        try {
          await ticketChannel.delete();
        } catch (deleteError) {
          // If the channel is already deleted, this will catch the 'Unknown Channel' error.
          if (deleteError.code !== 10003) {
            console.error("Error deleting the channel:", deleteError);
          }
        }
      }
    } else if (message.content === "?view-repos") {
      if (
        message.member.roles.cache.some(
          (role) => role.id === "1169479879318835211"
        )
      ) {
        const { data } = await octokit.repos.getContent({
          owner: "loyahdev",
          repo: "hydrogen",
          path: "community-repos.txt",
        });
        message.reply("The repo data has been sent to your direct messages.");
  
        //client.users.send(client.user.id, Buffer.from(data.content, 'base64').toString());
        message.author.send("The repo data is below: \n");
        if (Buffer.from(data.content, "base64").toString() !== "") {
          message.author.send(Buffer.from(data.content, "base64").toString());
        }
      } else {
        message.reply("You do not have permission to view the repos.");
      }
    } else if (message.content === "?delete-repos") {
      if (
        message.member.roles.cache.some(
          (role) => role.id === "1169479879318835211"
        )
      ) {
        const { data } = await octokit.repos.getContent({
          owner: "loyahdev",
          repo: "hydrogen",
          path: "community-repos.txt",
        });
  
        message.author.send("The repo data is below: \n");
        if (Buffer.from(data.content, "base64").toString() !== "") {
          message.author.send(Buffer.from(data.content, "base64").toString());
        }
  
        await octokit.repos.createOrUpdateFileContents({
          owner: "loyahdev",
          repo: "hydrogen",
          path: "community-repos.txt",
          message: "New repo uploaded.",
          content: "",
          sha: data.sha,
        });
        message.reply(
          "The repo has been deleted. You have been sent a direct message with its last known data."
        );
      } else {
        message.reply("You do not have permission to delete the repos.");
      }
    } else if (message.content.includes("?sign-app public-cert")) {
      if (!message.attachments.size) {
        message.reply(
          "You did not include the app in your message. Please try again."
        );
        return;
      }
  
      // Check the extensions of each attachment
      const validExtensions = ["ipa"]; // Add more valid extensions if needed
  
      let allAttachmentsAreValid = true;
  
      for (const attachment of message.attachments.values()) {
        if (
          !validExtensions.includes(
            attachment.name.split(".").pop().toLowerCase()
          )
        ) {
          allAttachmentsAreValid = false;
          break;
        }
      }
  
      if (!allAttachmentsAreValid) {
        message.reply("Your app is not an IPA file. Please try again.");
        return;
      }
  
      // All attachments are valid IPAs
      message.reply(
        "Please wait while we sign the app. This may take a few minutes."
      );
  
      const attachment = message.attachments.first();
      const inputIPAPath = `./${attachment.name}`;
      const outputIPAPath = `./TheiNsideDevs-Signed_${attachment.name}`; // Define this varia
      const p12Path = "./nabzclan.p12";
      const mobileProvPath = "./nabzclan.mobileprovision";
  
      try {
        const response = await axios.get(attachment.url, {
          responseType: "stream",
        });
        const fileStream = fs.createWriteStream(inputIPAPath);
  
        response.data.pipe(fileStream);
        fileStream.on("finish", async () => {
          try {
            await signIPABot(
              inputIPAPath,
              outputIPAPath,
              p12Path,
              mobileProvPath
            ); // Sign the IPA
  
            // Ensure that `outputIPAPath` is defined and points to the signed IPA file
            const signedIPAPath = outputIPAPath; // Replace with the actual path to the signed IPA file
  
            const absolutePath = path.resolve(signedIPAPath);
            await uploadTo0x0St(
              absolutePath,
              `Signed_${attachment.name}`,
              message.channel,
              message
            );
  
            // Move the file deletion here, after it has been uploaded
            if (fs.existsSync(outputIPAPath)) {
              // fs.unlinkSync(outputIPAPath);
            }
          } catch (error) {
            console.error(error);
            message.reply(
              "An error occurred while signing and compressing the IPA file."
            );
          } finally {
            if (fs.existsSync(inputIPAPath)) {
              fs.unlinkSync(inputIPAPath);
            }
          }
        });
      } catch (error) {
        console.error(error);
        message.reply("An error occurred while processing the attached file.");
      }
    } else if (message.content === "?sign-app private-cert") {
      const ticketName = `signing-${message.author.tag.replace("#", "-")}`;
      console.log(`Creating signing channel with name: ${ticketName}`);
  
      const signingChannel = await message.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: ticketCategoryID,
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
      });
  
      const initialMessage = await safeSendMessage(
        signingChannel,
        "<@" + message.author.id + ">, please upload the `.p12` certificate file."
      );
      const cancelFilter = (reaction, user) =>
        reaction.emoji.name === "❌" && user.id === message.author.id;
      const filter = (response) => response.author.id === message.author.id;
      const cancelCollector = initialMessage.createReactionCollector({
        filter: cancelFilter,
        time: 60000 * 5,
      });
      if (initialMessage) {
        await initialMessage.react("❌").catch(console.error);
      } else {
        console.error("Failed to send initial message or channel was deleted.");
      }
  
      cancelCollector.on("collect", async (reaction, user) => {
        try {
          //await initialMessage.reactions.removeAll();
          const confirmMessage = await signingChannel.send(
            "<@" +
              user.id +
              "> has requested to close this ticket. React with ✅ to confirm."
          );
          await confirmMessage.react("✅");
  
          const confirmFilter = (reaction, user) =>
            reaction.emoji.name === "✅" && user.id === message.author.id;
          const confirmCollector = confirmMessage.createReactionCollector({
            filter: confirmFilter,
            max: 1,
            time: 30000,
          });
  
          confirmCollector.on("collect", async () => {
            await signingChannel.delete();
            console.log(`Deleted signing channel ${signingChannel.name}`);
          });
  
          confirmCollector.on("end", (collected) => {
            if (collected.size === 0) {
              confirmMessage
                .edit("Ticket close not confirmed, ticket will not be closed.")
                .catch(console.error);
            }
          });
        } catch (error) {
          console.error("Error handling cancel collector: ", error);
        }
      });
  
      cancelCollector.on("end", (collected) => {
        if (collected.size === 0) {
          signingChannel
            .send(
              "No reaction after the time limit. If you still want to close the ticket, please react with ❌."
            )
            .catch(console.error);
        }
      });
  
      // Listen for the .p12 file upload
      const p12Collector = signingChannel.createMessageCollector({
        filter,
        max: 1,
        time: 60000,
      });
      p12Collector.on("collect", async (p12Message) => {
        if (
          !p12Message.attachments.size ||
          !p12Message.attachments.first().name.endsWith(".p12")
        ) {
          signingChannel
            .send("No `.p12` file found. Please rerun the command.")
            .catch(console.error);
          return;
        }
        const p12Url = p12Message.attachments.first().url;
        // Process the .p12 file using the URL
  
        // Now ask for the .mobileprovision file
        const provisionMessage = await signingChannel.send(
          "<@" +
            message.author.id +
            ">, please upload the `.mobileprovision` provisioning profile."
        );
        const mobileProvisionCollector = signingChannel.createMessageCollector({
          filter,
          max: 1,
          time: 60000,
        });
  
        let p12Path = '';
        let mobileProvPath = '';
  
        mobileProvisionCollector.on("collect", async (mobileProvisionMessage) => {
          if (
            !mobileProvisionMessage.attachments.size ||
            !mobileProvisionMessage.attachments
              .first()
              .name.endsWith(".mobileprovision")
          ) {
            signingChannel
              .send("No `.mobileprovision` file found. Please rerun the command.")
              .catch(console.error);
            return;
          }
          const mobileProvisionUrl =
            mobileProvisionMessage.attachments.first().url;
          // Process the .mobileprovision file using the URL
          // Continue with your app signing logic here
          // After collecting the .mobileprovision file, ask for the IPA file
          const ipaRequestMessage = await signingChannel.send(
            "<@" +
              message.author.id +
              ">, please upload the `.ipa` file for signing."
          );
          const ipaFilter = (response) => {
            return (
              response.author.id === message.author.id &&
              response.attachments.size > 0 &&
              response.attachments.first().name.endsWith(".ipa")
            );
          };
  
          signingChannel.send(
            "Please wait while we sign the app. This may take a few minutes."
          );
  
          const ipaCollector = signingChannel.createMessageCollector({
            ipaFilter,
            max: 1,
            time: 60000 * 5,
          });
  
          ipaCollector.on("collect", async (ipaMessage) => {
            // Check if the .ipa file is attached
            if (
              !ipaMessage.attachments.size ||
              !ipaMessage.attachments.first().name.endsWith(".ipa")
            ) {
              signingChannel
                .send("No `.ipa` file found. Please upload the `.ipa` file.")
                .catch(console.error);
              return;
            }
  
            // Get the .ipa file URL
            const ipaUrl = ipaMessage.attachments.first().url;
  
            // Download the IPA file
            const ipaPath = path.join(
              __dirname,
              ipaMessage.attachments.first().name
            );
            const writer = fs.createWriteStream(ipaPath);
  
            const response = await axios.get(ipaUrl, {
              responseType: "stream",
            });
  
            response.data.pipe(writer);
  
            return new Promise((resolve, reject) => {
              writer.on("finish", resolve);
              writer.on("error", reject);
            })
              .then(async () => {
                // Sign the IPA
                const signedIpaPath = path.join(
                  __dirname,
                  `Signed_${ipaMessage.attachments.first().name}`
                );
                try {
                  // Use the p12Path and mobileProvPath that were saved earlier
                  await signIPABot(
                    ipaPath,
                    signedIpaPath,
                    p12Path,
                    mobileProvPath
                  );
                  signingChannel
                    .send(
                      "The app has been signed successfully. Here is the download link: [Download signed IPA](url-to-signed-ipa)"
                    )
                    .catch(console.error);
                } catch (error) {
                  console.error(error);
                  signingChannel
                    .send("An error occurred while signing the IPA file.")
                    .catch(console.error);
                } finally {
                  // Clean up the downloaded IPA
                  fs.unlinkSync(ipaPath);
                }
              })
              .catch((error) => {
                console.error(error);
                signingChannel
                  .send("An error occurred while downloading the IPA file.")
                  .catch(console.error);
              });
          });
  
          ipaCollector.on("end", (collected) => {
            if (collected.size === 0) {
              ipaRequestMessage
                .edit(
                  "<@" +
                    message.author.id +
                    ">, you did not upload the `.ipa` file in time. Please start the process again."
                )
                .catch(console.error);
            }
          });
        });
  
        mobileProvisionCollector.on("end", (collected) => {
          if (collected.size === 0) {
            provisionMessage
              .edit(
                "<@" +
                  message.author.id +
                  ">, you did not upload the `.mobileprovision` file in time. Please start the process again."
              )
              .catch(console.error);
          }
        });
      });
  
      p12Collector.on("end", (collected) => {
        if (collected.size === 0) {
          safeSendMessage(
            signingChannel,
            "<@" +
              message.author.id +
              ">, you did not upload the `.p12` file in time. Please start the process again."
          );
        }
      });
    }
  });
  
  function signIPABot(inputIPAPath, outputIPAPath, p12Path, mobileProvPath) {
    return new Promise((resolve, reject) => {
      const zsign = spawn("./zsign", [
        "-k",
        p12Path,
        "-m",
        mobileProvPath,
        "-p",
        "nabzclan.vip-fsfs57rh", //nabzclan.vip-fsfs57rh
        "-o",
        outputIPAPath,
        inputIPAPath,
      ]);
  
      zsign.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });
  
      zsign.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });
  
      zsign.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(`Error: zsign process exited with code ${code}`);
        }
      });
    });
  }
  
  async function processRepoLink(reponame, repoLink, channel) {
    channel.send(
      "We are uploading " +
        reponame +
        " at the link " +
        repoLink +
        ". Please wait while we upload the repo."
    );
    // Fetch the current content of the file
    const { data } = await octokit.repos.getContent({
      owner: "loyahdev",
      repo: "hydrogen",
      path: "community-repos.txt",
    });
  
    let newContent = "Undefined.";
  
    if (data.content !== "") {
      // Append the new content
      newContent =
        Buffer.from(data.content, "base64").toString() +
        "\n" +
        reponame +
        "\n" +
        repoLink;
    } else {
      newContent =
        Buffer.from(data.content, "base64").toString() +
        reponame +
        "\n" +
        repoLink;
    }
  
    // Commit the changes
    await octokit.repos.createOrUpdateFileContents({
      owner: "loyahdev",
      repo: "hydrogen",
      path: "community-repos.txt",
      message: "New repo uploaded.",
      content: Buffer.from(newContent).toString("base64"),
      sha: data.sha,
    });
    channel.send("Your repo was uploaded successfully!");
    setTimeout(() => deleteChannel(channel), 10000);
  }
  
  async function deleteChannel(channel) {
    await channel.delete("User requested deletion.");
    console.log(`Deleted channel ${channel.name}`);
  }
  
  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return; // Ignore reactions from bots
  
    const { message, emoji } = reaction;
    const { channel } = message;
  
    if (emoji.name === "❌" && channel.name.startsWith("ticket-")) {
      // Remove other reactions except the '❌' from the user
      try {
        await message.reactions.cache.each(async (r) => {
          if (r.emoji.name !== "❌") {
            await r.remove().catch(console.error);
          } else {
            // Remove only the bot's own reaction, keeping the user's '❌'
            await r.users.remove(client.user.id).catch(console.error);
          }
        });
      } catch (error) {
        console.error("Failed to remove reactions:", error);
      }
  
      // Send a message to confirm deletion
      const confirmMessage = await channel.send(
        "<@" +
          user.id +
          "> has requested to close this ticket. React with ✅ to confirm."
      );
      await confirmMessage.react("✅");
  
      const filter = (reaction, user) => {
        return ["✅"].includes(reaction.emoji.name) && !user.bot;
      };
  
      const collector = confirmMessage.createReactionCollector({
        filter,
        time: 15000,
      });
  
      collector.on("collect", async (reaction, user) => {
        if (reaction.emoji.name === "✅") {
          // Delete the channel
          channel
            .delete("Ticket closed by user request.")
            .then(() => console.log(`Deleted channel ${channel.name}`))
            .catch(console.error);
        }
      });
  
      collector.on("end", (collected) => {
        if (collected.size === 0) {
          confirmMessage
            .edit("Ticket close request timed out.")
            .catch(console.error);
        }
      });
    }
  });
  
  client.login(
    "MTE2OTI5MjA2NDYzOTQzMDY3Nw.GnO5X8.xRVVUeZWJjM6cea5jvZTgwTau_eyuRkMUR9dpM"
  );