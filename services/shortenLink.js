const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function createAndUploadRedirectHTML(redirectUrl) {
  // Define the path for the temporary HTML file
  const filePath = path.join(__dirname, 'redirect.html');

  // HTML content with a meta redirect
  const htmlContent = `
    <html>
    <head>
      <meta http-equiv="refresh" content="0; URL='${redirectUrl}'" />
    </head>
    <body>
      <p>If you are not redirected, <a href="${redirectUrl}">click here</a>.</p>
    </body>
    </html>
  `;

  // Write the HTML content to a file
  fs.writeFileSync(filePath, htmlContent);

  // FormData to hold the file for upload
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  try {
    // Post the file to 0x0.st
    const response = await axios.post('https://0x0.st', formData, {
      headers: formData.getHeaders(),
    });

    // Output the response
    console.log('File uploaded:', response.data);

    // Clean up: delete the temp HTML file
    fs.unlinkSync(filePath);

    return response.data; // This is the shortened URL
  } catch (error) {
    console.error('Error uploading file:', error);

    // Clean up: delete the temp HTML file if there was an error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw error;
  }
}

module.exports = { createAndUploadRedirectHTML };