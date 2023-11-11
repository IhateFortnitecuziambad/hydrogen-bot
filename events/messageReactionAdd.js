module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
      // When we receive a reaction we check if the reaction is partial or not
      if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
          await reaction.fetch();
        } catch (error) {
          console.error('Something went wrong when fetching the message:', error);
          return;
        }
      }
      
      // Now the message has been cached and is fully available
      const { message } = reaction;
  
      // Ignore all reactions added by the bot
      if (user.bot) return;
  
      if (reaction.emoji.name === '❌' && message.channel.name.startsWith('ticket-')) {
        // Custom logic for handling ticket closure, e.g., confirming the closure and deleting the channel
        if (message.author.id === user.id) {
          const confirmMessage = await message.channel.send(
            `${user.tag} has requested to close this ticket. React with ✅ to confirm.`
          );
          await confirmMessage.react('✅');
    
          const collector = confirmMessage.createReactionCollector({
            filter: (reaction, user) => {
              return reaction.emoji.name === '✅' && !user.bot;
            },
            time: 15000
          });
    
          collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name === '✅') {
              message.channel.delete()
                .then(() => console.log(`Deleted channel ${message.channel.name}`))
                .catch(console.error);
            }
          });
  
          collector.on('end', collected => {
            if (collected.size === 0) {
              confirmMessage.edit('Ticket close request timed out.');
            }
          });
        }
      }
    },
  };
  