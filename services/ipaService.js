const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');

// Path to the zsign executable in the root directory
const zsignExecutable = './zsign';

// Function to sign an IPA file using zsign
const signIPABot = async (inputIPAPath, p12Path, mobileProvPath, password) => {
  const outputIPAPath = inputIPAPath.replace('.ipa', '-signed.ipa');

  return new Promise((resolve, reject) => {
    const zsign = spawn(zsignExecutable, [
      '-k', p12Path,
      '-m', mobileProvPath,
      '-p', password,
      '-o', outputIPAPath,
      inputIPAPath,
    ]);

    zsign.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    zsign.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    zsign.on('close', (code) => {
      if (code === 0) {
        resolve(outputIPAPath);
      } else {
        reject(`zsign process exited with code ${code}`);
      }
    });
  });
};

// Function to download a file using axios
const downloadFile = async (url, outputPath) => {
  const response = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(outputPath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(outputPath));
    writer.on('error', reject);
  });
};

module.exports = {
  signIPABot,
  downloadFile,
};
