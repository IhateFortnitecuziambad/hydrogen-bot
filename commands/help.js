const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Provides help for all available commands.',
  execute: async (message) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({
        name: "Help Command",
        iconURL: "https://pasteboard.co/99oWyOWqaaFE.png",
        url: "https://discord.gg/v24C6NdbTv",
      })
      .setTitle("Available Commands")
      .setDescription("Here is a list of available commands you can use:")
      .addFields(
        { name: "?help", value: "Takes you here!", inline: true },
        { name: "?upload", value: "Upload a repository to our community.", inline: true },
        { name: "?view-repos", value: "Admin only, allows you to view the current repo data.", inline: true },
        { name: "?delete-repos", value: "Admin only, allows you to delete a specific repo or all the repos.", inline: true },
        { name: "?sign-app public-cert", value: "Allows you to sign an iOS app and return a signed IPA file.", inline: true },
        { name: "?sign-app private-cert", value: "You can sign an app using your own certificate files.", inline: true }
      )
      .setColor("#0b3880")
      .setFooter({ text: "Made with ❤️ by loyahdev." })
      .setTimestamp();

    await message.channel.send({ embeds: [helpEmbed] });
  },
};
