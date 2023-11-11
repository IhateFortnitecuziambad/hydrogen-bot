const fs = require('fs');
const path = require('path');

// Path to the file where repo links are stored
const repoFilePath = path.join(__dirname, '../data/community-repos.txt'); // Adjust the directory structure as necessary

// Function to add a new repo to the list
const addRepoToList = async (repoName, repoLink) => {
  // Ensure the directory and file exist
  const dir = path.dirname(repoFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Append the new repo information to the file
  const repoEntry = `Repository Name: ${repoName}\nRepository Link: ${repoLink}\n\n`;
  
  return new Promise((resolve, reject) => {
    fs.appendFile(repoFilePath, repoEntry, 'utf8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(`The repository "${repoName}" has been successfully added.`);
      }
    });
  });
};

// Function to get the list of all repos
const getRepoList = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(repoFilePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

module.exports = {
  addRepoToList,
  getRepoList,
};
