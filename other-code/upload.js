const fs = require('fs');
const FormData = require('form-data');

async function uploadFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist.');
    return;
  }

  const fileName = filePath.split('/').pop();
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath), fileName);

  // Dynamically import 'node-fetch'
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

  try {
    const response = await fetch('https://transfer.sh/', {
      method: 'POST',
      body: formData
    });
    const link = await response.text();
    console.log('File uploaded:', link);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

// Replace '/path/to/your/file' with the actual file path
uploadFile('./hydrogen.plist');
