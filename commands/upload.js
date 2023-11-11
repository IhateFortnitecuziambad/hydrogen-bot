const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { safeSendMessage } = require("../utils/messageUtils"); // Make sure this utility is correctly set up
const path = require("path");
const fs = require("fs");

const { Octokit } = require("@octokit/rest");

// Instantiate Octokit with a personal access token
const octokit = new Octokit({
  auth: "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",
});

module.exports = {
  name: "upload",
  description: "Upload a repository to our community.",
  async execute(message) {
    const ticketName = `ticket-${message.author.tag.replace("#", "-")}`;
    const ticketCategoryID = "1169861472369774653"; // Replace with your actual category ID for tickets

    const ticketChannel = await message.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: ticketCategoryID,
      permissionOverwrites: [
        {
          id: message.author.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: message.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Repo Upload",
        iconURL:
          "https://techcrunch.com/wp-content/uploads/2015/04/codecode.jpg?w=1390&crop=1",
        url: "https://docs.loyahdev.me",
      })
      .setDescription(
        `Welcome ${message.author}. Below please type the name of the repo you would like to add to the community. If you would like to cancel at any time just react below.`
      )
      .setColor("#3498db");

    const botMessage = await ticketChannel.send({ embeds: [embed] });
    botMessage.react("❌");
    ticketChannel.send(`<@${message.author.id}>`);

    const filter = (response) => {
      return response.author.id === message.author.id;
    };

    try {
      await safeSendMessage(
        ticketChannel,
        "Please provide the name of the repository:"
      );
      const collected = await ticketChannel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ["time"],
      });
      const userMessage = collected.first();

      let isValidUrl = false;
      let linkMessage;

      do {
        await safeSendMessage(
          ticketChannel,
          "Please provide the link to the repository:"
        );
        const linkCollected = await ticketChannel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ["time"],
        });
        linkMessage = linkCollected.first();

        // Validate the repo link
        const urlRegex =
          /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        isValidUrl = urlRegex.test(linkMessage.content);

        if (isValidUrl) {
          await processRepoLink(
            userMessage.content,
            linkMessage.content,
            ticketChannel
          );
        } else {
          await safeSendMessage(
            ticketChannel,
            "The provided text is not a valid URL. Please enter a valid URL."
          );
          // Wait for 5 seconds before deleting the channel
          setTimeout(async () => {
            try {
              console.log(`Deleting channel ${channel.name}`);
              await channel.delete("Repository processed and ticket closed.");
              console.log(`Channel ${channel.name} deleted successfully.`);
            } catch (deleteError) {
              console.error(
                `Failed to delete the channel ${channel.name}:`,
                deleteError
              );
            }
          }, 5000); // 5000 milliseconds equals 5 seconds
        }
      } while (!isValidUrl);
    } catch (error) {
      console.error(
        "An error occurred while processing the upload command:",
        error
      );
      await ticketChannel.delete().catch(console.error);
    }
  },
};

async function processRepoLink(repoName, repoLink, channel) {
  const repoFilePath = "community-repos.txt"; // The path in the repository
  const owner = "loyahdev"; // Your GitHub username or organization
  const repo = "hydrogen"; // The repository to update

  let sha; // Store the SHA of the existing file to update it
  let existingContent = ""; // Store the existing content of the file

  // Fetch the current content of the file and its SHA
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: repoFilePath,
    });

    sha = response.data.sha; // Capture the SHA for the update call
    existingContent = Buffer.from(response.data.content, "base64").toString(
      "utf8"
    );
  } catch (error) {
    if (error.status === 404) {
      console.log("File not found. It will be created.");
    } else {
      console.error("Error fetching repository data:", error);
      await safeSendMessage(channel, "Failed to fetch repository data.");
      return;
    }
  }

  if (existingContent != "") {
    // Append the new repository entry to the existing content
    newContent = `${existingContent}\n${repoName}\n${repoLink}\n`;
  }
  else
  {
    newContent = `${repoName}\n${repoLink}\n`;
  }
  const encodedContent = Buffer.from(newContent).toString("base64");
  const message = `Updated with ${repoName}`;

  // Create or update the file in the repository
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: repoFilePath,
      message,
      content: encodedContent,
      sha: sha, // Include the SHA in the update call
    });

    await safeSendMessage(
      channel,
      `The repository "${repoName}" has been successfully added to the list.`
    );

    // Wait for 5 seconds before deleting the channel
    setTimeout(async () => {
      try {
        console.log(`Deleting channel ${channel.name}`);
        await channel.delete("Repository processed and ticket closed.");
        console.log(`Channel ${channel.name} deleted successfully.`);
      } catch (deleteError) {
        console.error(
          `Failed to delete the channel ${channel.name}:`,
          deleteError
        );
      }
    }, 5000); // 5000 milliseconds equals 5 seconds
  } catch (error) {
    console.error("Error updating the repository list:", error);
    await safeSendMessage(channel, "Failed to add the repository to the list.");
    // Wait for 5 seconds before deleting the channel
    setTimeout(async () => {
      try {
        console.log(`Deleting channel ${channel.name}`);
        await channel.delete("Repository processed and ticket closed.");
        console.log(`Channel ${channel.name} deleted successfully.`);
      } catch (deleteError) {
        console.error(
          `Failed to delete the channel ${channel.name}:`,
          deleteError
        );
      }
    }, 5000); // 5000 milliseconds equals 5 seconds
  }
}
