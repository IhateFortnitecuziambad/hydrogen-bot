const axios = require("axios");
const AdmZip = require("adm-zip");
const bplistParser = require('bplist-parser');

async function downloadAndExtractBundleId(ipaUrl) {
  // Download IPA file
  const ipaResponse = await axios({
    url: ipaUrl,
    method: 'GET',
    responseType: 'arraybuffer' // Important to handle binary data
  });

  // Write IPA to a file or handle it directly as a buffer
  const ipaData = ipaResponse.data;

  // Load the IPA file with AdmZip
  const zip = new AdmZip(ipaData);
  const zipEntries = zip.getEntries();

  // Find the Info.plist file
  const infoPlistEntry = zipEntries.find(entry => entry.entryName.match(/Payload\/.*\.app\/Info\.plist$/));

  if (!infoPlistEntry) {
    throw new Error("Info.plist file not found in the IPA file.");
  }

  // Parse Info.plist file
  const infoPlistData = bplistParser.parseBuffer(infoPlistEntry.getData());

  // Extract the CFBundleIdentifier
  const bundleId = infoPlistData[0]['CFBundleIdentifier'];
  if (!bundleId) {
    throw new Error("Bundle ID not found in Info.plist file.");
  }

  console.log(`Bundle ID: ${bundleId}`);
  return bundleId;
}

  module.exports = { downloadAndExtractBundleId };