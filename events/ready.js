module.exports = {
  name: 'ready',
  once: true, // This ensures that the event is only triggered once
  execute(client) {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('our community repo! Type ?upload', {
      type: 'WATCHING', // This can be PLAYING, STREAMING, LISTENING, WATCHING, etc.
    });
  },
};
