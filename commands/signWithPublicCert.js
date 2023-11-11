const uploadTo0x0St = require("../services/uploadTo0x0");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { safeSendMessage } = require("../utils/messageUtils");
const signWithPublicCert = {
  name: "sign-app-public",
  description: "Sign an IPA file with a public certificate.",
  execute: async (message) => {
    if (!message.attachments.size) {
      return safeSendMessage(
        message.channel,
        "You did not include the app in your message. Please try again with an IPA file attached."
      );
    }

    message.reply("Signing your IPA file this may take a minute...");

    const attachment = message.attachments.first();
    if (!attachment.name.toLowerCase().endsWith(".ipa")) {
      return safeSendMessage(
        message.channel,
        "The attached file is not an IPA file. Please try again with a valid IPA file."
      );
    }

    const inputIPAPath = path.join(__dirname, attachment.name);
    const outputIPAPath = path.join(__dirname, `Signed_${attachment.name}`);
    const p12Path = path.join(__dirname, "../nabzclan.p12");
    //const p12Path = path.join(__dirname, "../Certificates.p12");
    const mobileProvPath = path.join(__dirname, "../nabzclan.mobileprovision");
    //const mobileProvPath = path.join(__dirname, "../loyahdev.mobileprovision");

    if (!fs.existsSync(p12Path)) {
      console.error("The p12 file does not exist at the path:", p12Path);
      return;
    }

    if (!fs.existsSync(mobileProvPath)) {
      console.error(
        "The mobileprovision file does not exist at the path:",
        mobileProvPath
      );
      return;
    }
    const password = "nabzclan.vip-fsfs57rh";
    //const password = "78473duioh6389";

    try {
      const response = await axios.get(attachment.url, {
        responseType: "stream",
      });
      const writer = fs.createWriteStream(inputIPAPath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // Sign the IPA file
      await signIPA(
        inputIPAPath,
        outputIPAPath,
        p12Path,
        mobileProvPath,
        password,
        message
      );
    } catch (error) {
      console.error("Error signing the IPA file:", error);
      safeSendMessage(
        message.channel,
        "An error occurred while processing the IPA file."
      );
    } finally {
      const filenameWithoutExtension = path.parse(outputIPAPath).name;
      uploadTo0x0St(outputIPAPath, message, filenameWithoutExtension);

      // Cleanup
      if (fs.existsSync(inputIPAPath)) {
        fs.unlinkSync(inputIPAPath);
      }
      //if (fs.existsSync(outputIPAPath)) {
        //fs.unlinkSync(outputIPAPath);
      //}
    }
  },
};

const signIPA = (
  inputIPAPath,
  outputIPAPath,
  p12Path,
  mobileProvPath,
  password,
  message
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

module.exports = signWithPublicCert;
