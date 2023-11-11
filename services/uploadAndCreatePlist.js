const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const { createAndUploadRedirectHTML } = require("./shortenLink");
const { downloadAndExtractBundleId } = require("./bundleidExtractor");

/*
async function extractAppBundleId(ipaUrl) {
  console.log(`Starting bundle ID extraction from IPA at: ${ipaUrl}`);
  const tempIpaPath = "./temp.ipa";
  console.log(`Downloading IPA file to: ${tempIpaPath}`);

  const response = await axios({
    url: ipaUrl,
    method: "GET",
    responseType: "stream",
  });

  const writer = fs.createWriteStream(tempIpaPath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  console.log("IPA download finished, starting extraction...");
  const directory = await unzipper.Open.file(tempIpaPath);
  console.log("Unzipping completed, looking for Info.plist in the root directory...");

  const appDirectory = directory.files.find((file) =>
    file.path.includes('.app/') && file.path.endsWith('Info.plist')
  );

  // Assuming the IPA file is structured with the Info.plist at the root directory after unzipping
  const infoPlistFile = appDirectory.files.find((file) => 
    file.path === 'Info.plist' // Only check the root directory
  );

  if (!infoPlistFile) {
    throw new Error('Info.plist file not found in the root directory of the IPA.');
  }

  console.log("Info.plist found, starting to read buffer...");
  const infoPlistBuffer = await infoPlistFile.buffer();
  console.log("Buffer read, starting to parse plist...");

  const infoPlistData = bplistParser.parseBuffer(infoPlistBuffer);
  const bundleId = infoPlistData[0]['CFBundleIdentifier'];

  if (!bundleId) {
    throw new Error('CFBundleIdentifier not found in Info.plist.');
  }

  console.log(`Bundle ID extracted: ${bundleId}`);

  // Clean up: delete the temp file
  console.log(`Deleting temporary IPA file: ${tempIpaPath}`);
  fs.unlinkSync(tempIpaPath);

  return bundleId;
}
*/

async function createPlistFile(ipaFileLink, fileName) {
  console.log("Creating plist file for IPA file:", ipaFileLink);
  const bundleId = await downloadAndExtractBundleId(ipaFileLink);
  console.log(bundleId);
  console.log(`Generating plist content for bundle ID: ${bundleId}`);

  const appIconLink = "https://i.imgur.com/8jXwJ7R.png";
  const installIconLink = "https://i.ibb.co/gjw0F4m/image61.jpg";
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>${ipaFileLink}</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>full-size-image</string> <!-- App icon (512x512px for App Store) -->
                    <key>url</key>
                    <string>${appIconLink}</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>install-icon</string> <!-- Installation icon -->
                    <key>url</key>
                    <string>${installIconLink}</string>
                </dict>
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>${bundleId}</string>
                <key>bundle-version</key>
                <string>1.0</string>
                <key>kind</key>
                <string>software</string>
                <key>title</key>
                <string>Signed by Hydrogen</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>`.trim();

  const filePath = "./temp.plist";
  fs.writeFileSync(filePath, plistContent);
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    const response = await axios.post("https://0x0.st", formData, {
      headers: formData.getHeaders(),
    });
    console.log("Plist file uploaded:", response.data.trim());
    const redirectHTML = await createAndUploadRedirectHTML("itms-services://?action=download-manifest&url=" + response.data.trim());
    return redirectHTML;
  } catch (error) {
    console.error("Error uploading plist file:", error);
    throw error;
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = { createPlistFile };
