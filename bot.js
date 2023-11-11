const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require('./config/botConfig');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Map();
client.events = new Map();

// Dynamically require command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Dynamically require event files
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.login("MTE2OTI5MjA2NDYzOTQzMDY3Nw.GtsJYy.6I1VS7Kxp3FTkB3oCMdAtw2PEesLcxOoNoYvJ8");
