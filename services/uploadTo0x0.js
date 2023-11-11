const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const {
  createPlistFile,
  extractAppBundleId,
} = require("./uploadAndCreatePlist");
const { file } = require("googleapis/build/src/apis/file");

async function uploadTo0x0St(filePath, message, fileName, author) {
  // Ensure the file exists
  if (!fs.existsSync(filePath)) {
    throw new Error("File does not exist.");
  }

  try {
    // Prepare the form data
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath), {
      headers: {
        "Content-Disposition": `attachment; filename="hydrogenapp.html"`,
      },
    });

    // Make the request to 0x0.st
    const response = await axios.post("https://0x0.st", formData, {
      headers: formData.getHeaders(),
    });

    // Handle the response
    if (response.status === 200) {
      console.log(`File uploaded to: ${response.data.trim()}`);
      console.log(fileName);
      const plistUrl = await createPlistFile(response.data.trim(), fileName);
      if (message.channel) {
        message.channel.send(
          "<@" +
            message.author.id +
            ">" +
            ", Here is your signed app just click to install: " +
            plistUrl.trim() +
            "/" +
            fileName
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      else
      {
        message.send(
          "<@" +
            author +
            ">" +
            ", Here is your signed app just click to install: " +
            plistUrl.trim() +
            "/" +
            fileName
        );
        message.send("The channel will be deleted in 30 seconds.");
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return response.data.trim(); // Returns the URL to the uploaded file
    } else {
      throw new Error(`Failed to upload file. Status: ${response.status}`);
    }
  } catch (error) {
    // Handle any errors during the upload
    console.error("Failed to upload file to 0x0.st", error);
    throw error;
  }
}

module.exports = uploadTo0x0St;
