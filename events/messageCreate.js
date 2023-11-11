module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
      if (!message.content.startsWith('?') || message.author.bot) return;
  
      const args = message.content.slice(1).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
  
      // If the command doesn't exist, exit early
      if (!client.commands.has(commandName)) return;
  
      const command = client.commands.get(commandName);
  
      try {
        // Execute the command
        await command.execute(message, args);
      } catch (error) {
        console.error(error);
        await message.reply('there was an error trying to execute that command!');
      }
    },
  };
  