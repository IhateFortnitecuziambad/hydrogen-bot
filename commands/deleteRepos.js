const { Octokit } = require("@octokit/rest");
const config = require('../config/botConfig'); // Assuming your Octokit auth token is stored here

const octokit = new Octokit({
  auth: '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'// Ensure you have this in your config file or environment variables
});

module.exports = {
  name: 'delete-repos',
  description: 'Deletes repositories from the community listing.',
  execute: async (message) => {
    if (message.member.roles.cache.some(role => role.id === "1169479879318835211")) {
      try {
        const { data } = await octokit.repos.getContent({
          owner: "loyahdev",
          repo: "hydrogen",
          path: "community-repos.txt",
        });

        // Send the current repo data to the message author
        const repoData = Buffer.from(data.content, "base64").toString();
        await message.author.send("The repo data is below:");
        await message.author.send(`\`\`\`${repoData}}\`\`\``);

        // Clear the content of the community-repos.txt file
        await octokit.repos.createOrUpdateFileContents({
          owner: "loyahdev",
          repo: "hydrogen",
          path: "community-repos.txt",
          message: "Repository list cleared.",
          content: "", // Sending an empty string to clear the file
          sha: data.sha,
        });

        // Notify the user in the channel that the repos have been deleted
        await message.reply(
          "The repo has been deleted. You have been sent a direct message with its last known data."
        );
      } catch (error) {
        console.error('There was an error accessing the GitHub API', error);
        message.reply('There was an error deleting the repositories.');
      }
    } else {
      message.reply("You do not have permission to delete the repos.");
    }
  },
};
