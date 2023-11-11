const { EmbedBuilder, MessageAttachment } = require('discord.js');
const { Octokit } = require("@octokit/rest");

// Initialize Octokit with your personal access token
const octokit = new Octokit({
  auth: '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'
});

module.exports = {
  name: 'view-repos',
  description: 'View the list of repositories in the community.',
  async execute(message) {
    // Check if the member has the required role to view repositories
    if (!message.member.roles.cache.some(role => role.id === "1169479879318835211")) {
      return message.reply("You do not have permission to view the repos.");
    }

    const owner = 'loyahdev'; // Your GitHub username or organization
    const repo = 'hydrogen'; // The repository name
    const repoFilePath = 'community-repos.txt'; // The path to the community repo file in the GitHub repository

    try {
      // Fetch the content from GitHub
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: repoFilePath,
      });

      // GitHub API returns content in base64, so we need to decode it
      const content = Buffer.from(response.data.content, 'base64').toString('utf8');

      // Send the content of the file to the user
      if (content.trim().length === 0) {
        return message.reply("The repository list is currently empty.");
      } else {
        // Discord messages have a limit of 2000 characters
        if (content.length < 2000) {
          return message.channel.send(`\`\`\`${content}\`\`\``);
        } else {
          // If the content is too large, send it as a text file
          const buffer = Buffer.from(content, 'utf8');
          const attachment = new MessageAttachment(buffer, 'community-repos.txt');
          return message.channel.send({ files: [attachment] });
        }
      }
    } catch (error) {
      console.error("An error occurred while fetching the repository list from GitHub:", error);
      message.reply("An error occurred while trying to fetch the repository list from GitHub.");
    }
  },
};
