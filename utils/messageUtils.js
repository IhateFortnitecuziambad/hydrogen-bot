module.exports = {
  // Function to safely send a message to a channel
  safeSendMessage: async (channel, content) => {
    try {
      const sentMessage = await channel.send(content);
      return sentMessage; // Return the sent message object
    } catch (error) {
      // Handle specific known error codes
      if (error.code === 10003) {
        console.error("Attempted to send a message to a deleted channel.");
      } else {
        // Log unexpected errors and rethrow them
        console.error("Failed to send message:", error);
        throw error;
      }
    }
  },
};
