module.exports = {
    deleteChannel: async (channel, reason = 'No reason provided') => {
      try {
        // Log the deletion reason and the name of the channel for debugging
        console.log(`Deleting channel ${channel.name} for reason: ${reason}`);
        await channel.delete(reason);
        console.log(`Deleted channel ${channel.name} successfully.`);
      } catch (error) {
        console.error(`Failed to delete channel ${channel.name}:`, error);
      }
    },
  };
  