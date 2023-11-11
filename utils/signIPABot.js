const { spawn } = require('child_process');
const fs = require('fs');

module.exports = {
  signIPABot: async (inputIPAPath, p12Path, mobileProvPath, password) => {
    const outputIPAPath = inputIPAPath.replace('.ipa', '-signed.ipa');
    const zsignCommand = './zsign'; // Assuming zsign is in the root directory of your project

    return new Promise((resolve, reject) => {
      if (!fs.existsSync(p12Path) || !fs.existsSync(mobileProvPath)) {
        return reject(new Error('Certificate or mobile provisioning file not found.'));
      }

      const zsign = spawn(zsignCommand, [
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
          console.log(`Signed IPA successfully created at ${outputIPAPath}`);
          resolve(outputIPAPath);
        } else {
          fs.unlink(outputIPAPath, (err) => {
            if (err) console.error(`Failed to delete the output file: ${outputIPAPath}`, err);
          });
          reject(new Error(`zsign process exited with code ${code}`));
        }
      });

      zsign.on('error', (error) => {
        console.error('Error spawning zsign process', error);
        reject(error);
      });
    });
  },
};
