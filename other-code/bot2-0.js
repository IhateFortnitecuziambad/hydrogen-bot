const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder, ActivityType } = require("discord.js");
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");
const archiver = require('archiver');
const octokit = new Octokit({ auth: `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` });
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ]  
});

const { spawn } = require('child_process');
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: 'your-access-key-id',
  secretAccessKey: 'your-secret-access-key',
  region: 'your-region'
});

const s3 = new AWS.S3();

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('our communtiy repo! Type !upload', { type: ActivityType.Watching });
});


const ticketCategoryID = '1169861472369774653'; // Replace with the actual category ID for tickets

client.on('messageCreate', async (message) => {
  if (!message.content) return;

  if (message.content === '!upload') {
    const ticketName = `ticket-${message.author.tag}`;
    
    console.log(`Creating ticket channel with name: ${ticketName}`);

    const ticketChannel = await message.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,  // Using ChannelType enum
      parent: ticketCategoryID,
      permissionOverwrites: [
        {
          id: message.author.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: message.guild.id, // This is the @everyone role ID
          deny: [PermissionFlagsBits.ViewChannel], // Denying VIEW_CHANNEL permission for @everyone
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Repo Upload', iconURL: 'https://techcrunch.com/wp-content/uploads/2015/04/codecode.jpg?w=1390&crop=1', url: 'https://docs.loyahdev.me' })
      .setDescription(`Welcome ${message.author}. Below please type the name of the repo you would like to add to the community. If you would like to cancel at any time just react below.`)
      .setColor('#3498db');

    const botMessage = await ticketChannel.send({ embeds: [embed] });
    botMessage.react('❌');
    ticketChannel.send("<@" + message.author.id + ">");

    // Set up a filter to only collect messages from the user who created the ticket
    const filter = response => {
      return response.author.id === message.author.id;
    };

    try {
      // Wait for a message from the user who created the ticket
      ticketChannel.send("Please provide the name of the repository:")
      const collected = await ticketChannel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const userMessage = collected.first();

      const { data } = await octokit.repos.getContent({
        owner: 'loyahdev',
        repo: 'hydrogen',
        path: 'community-repos.txt'
      });

      let isValidUrl = false;
      let linkMessage;

      do {
        // Ask for the repo link
        const linkRequestMessage = await ticketChannel.send('Please provide the link to the repository:');

        // Wait for a message from the user who created the ticket
        const linkCollected = await ticketChannel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        linkMessage = linkCollected.first();

        // Validate the repo link (checking if it's a valid URL)
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (urlRegex.test(linkMessage.content)) {
          isValidUrl = true;
          // Call your function with the repo link
          await processRepoLink(userMessage.content, linkMessage.content, linkMessage.channel);
        } else {
          await ticketChannel.send('The provided text is not a valid URL.');
        }
      } while (!isValidUrl);
    } catch (error) {
      // Handle any errors (e.g., if the user didn't respond in time)
      ticketChannel.send("You did not respond in time. Please run the command again.")
      console.log('No response received:', error);
      setTimeout(() => deleteChannel(ticketChannel), 5000);
    }
  }
  else if (message.content === '!view-repos') {
    if (message.member.roles.cache.some(role => role.id === '1169479879318835211'))
    {
      const { data } = await octokit.repos.getContent({
        owner: 'loyahdev',
        repo: 'hydrogen',
        path: 'community-repos.txt'
      });
      message.reply('The repo data has been sent to your direct messages.')

      //client.users.send(client.user.id, Buffer.from(data.content, 'base64').toString());
      message.author.send("The repo data is below: \n")
      if (Buffer.from(data.content, 'base64').toString() !== "")
      {
        message.author.send(Buffer.from(data.content, 'base64').toString());;
      }
    }
    else
    {
      message.reply("You do not have permission to view the repos.")
    }
  }
  else if (message.content === '!delete-repos') {

    if (message.member.roles.cache.some(role => role.id === '1169479879318835211'))
    {
      const { data } = await octokit.repos.getContent({
        owner: 'loyahdev',
        repo: 'hydrogen',
        path: 'community-repos.txt'
      });

      message.author.send("The repo data is below: \n")
      if (Buffer.from(data.content, 'base64').toString() !== "")
      {
        message.author.send(Buffer.from(data.content, 'base64').toString());;
      }

      await octokit.repos.createOrUpdateFileContents({
        owner: 'loyahdev',
        repo: 'hydrogen',
        path: 'community-repos.txt',
        message: 'New repo uploaded.',
        content: '',
        sha: data.sha
      });
      message.reply('The repo has been deleted. You have been sent a direct message with its last known data.')
    }
    else
    {
      message.reply("You do not have permission to delete the repos.")
    }
  } 
  else if (message.content.includes("!sign-app public-cert")) {
    if (!message.attachments.size) {
      message.reply("You did not include the app in your message. Please try again.");
      return;
    }
  
    // Check the extensions of each attachment
    const validExtensions = ["ipa"]; // Add more valid extensions if needed
  
    let allAttachmentsAreValid = true;
  
    for (const attachment of message.attachments.values()) {
      if (!validExtensions.includes(attachment.name.split('.').pop().toLowerCase())) {
        allAttachmentsAreValid = false;
        break;
      }
    }
  
    if (!allAttachmentsAreValid) {
      message.reply("Your app is not an IPA file. Please try again.");
      return;
    }
  
    // All attachments are valid IPAs
    message.reply("Please wait while we sign the app. This may take a few minutes.");
  
    const attachment = message.attachments.first();
    const inputIPAPath = `./${attachment.name}`;
    const outputIPAPath = `./TheiNsideDevs-Signed_${attachment.name}`; // Define this varia
    const p12Path = './nabzclan.p12';
    const mobileProvPath = './nabzclan.mobileprovision';
  
    try {
      const response = await axios.get(attachment.url, { responseType: 'stream' });
      const fileStream = fs.createWriteStream(inputIPAPath);
  
      response.data.pipe(fileStream);
      fileStream.on('finish', async () => {
        try {
          await signIPABot(inputIPAPath, outputIPAPath, p12Path, mobileProvPath); // Sign the IPA

          // Ensure that `outputIPAPath` is defined and points to the signed IPA file
          const signedIPAPath = outputIPAPath; // Replace with the actual path to the signed IPA file
    
          const absolutePath = path.resolve(signedIPAPath);
          await uploadToS3(absolutePath, `Signed_${attachment.name}`, message.channel);
  
          // Move the file deletion here, after it has been uploaded
          if (fs.existsSync(outputIPAPath)) {
            // fs.unlinkSync(outputIPAPath);
          }
  
          message.channel.send("<@" + message.author.id + "> Here is IPA file signed by TheiNsideDevs.");
        } catch (error) {
          console.error(error);
          message.reply("An error occurred while signing and compressing the IPA file.");
        } finally {
          // fs.unlinkSync(inputIPAPath);
        }
      });
    } catch (error) {
      console.error(error);
      message.reply("An error occurred while processing the attached file.");
    }
    }
    else if (message.content === '!upload-file' && message.attachments.size > 0) {
        const attachment = message.attachments.first();
        const response = await axios.get(attachment.url, { responseType: 'stream' });
        
        const form = new FormData();
        form.append('access_token', '7556WotYdzJiorcBkUhmzSHleEfzkJthuaSclUw2UuHTUBxrCuZNf5Wd9WiU92AyHz1BFJTt0TsMxI6Yzk6dRU2b9eBqnE99qpBH9TuHM9t6IypV8v6vM19bVxiOuOw');
        form.append('account_id', '1352');
        form.append('upload_file', response.data, attachment.name);
        // Optionally specify a folder_id if needed
        form.append('folder_id', '');
    
        try {
          const uploadResponse = await axios.post('https://cloud.cocotweaks.com/api/v2/file/upload', form, {
            headers: {
              ...form.getHeaders(),
            },
          });
          console.log(JSON.stringify(uploadResponse.data, null, 2));
          message.reply(`File uploaded successfully: ${uploadResponse.data.data[0].url}`);
        } catch (error) {
          console.error('Error uploading file:', error);
          message.reply('Error uploading file.');
        }
      }
});

function signIPABot(inputIPAPath, outputIPAPath, p12Path, mobileProvPath) {
  return new Promise((resolve, reject) => {
    const zsign = spawn('./zsign', [
      '-k', p12Path,
      '-m', mobileProvPath,
      '-p', 'nabzclan.vip-fsfs57rh',
      '-o', outputIPAPath,
      inputIPAPath,
    ]);

    zsign.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    zsign.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    zsign.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`Error: zsign process exited with code ${code}`);
      }
    });
  });
}

async function processRepoLink(reponame, repoLink, channel) {
  channel.send('We are uploading ' + reponame + " at the link " + repoLink + ". Please wait while we upload the repo.");
  // Fetch the current content of the file
  const { data } = await octokit.repos.getContent({
    owner: 'loyahdev',
    repo: 'hydrogen',
    path: 'community-repos.txt'
  });
  
  let newContent = "Undefined.";

  if (data.content !== "") {
    // Append the new content
    newContent = Buffer.from(data.content, 'base64').toString() + '\n' + reponame + '\n' + repoLink;
  }
  else {
    newContent = Buffer.from(data.content, 'base64').toString() + reponame + '\n' + repoLink;
  }
  
  // Commit the changes
  await octokit.repos.createOrUpdateFileContents({
    owner: 'loyahdev',
    repo: 'hydrogen',
    path: 'community-repos.txt',
    message: 'New repo uploaded.',
    content: Buffer.from(newContent).toString('base64'),
    sha: data.sha
  });
  channel.send('Your repo was uploaded successfully!')
  setTimeout(() => deleteChannel(channel), 10000);
}

async function deleteChannel(channel)
{
  await channel.delete('User requested deletion.');
  console.log(`Deleted channel ${channel.name}`);
}

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;  // Ignore reactions from bots
  if (reaction.emoji.name === '❌') {
    const { channel } = reaction.message;
    if (channel.name.startsWith('ticket-')) {
      const botMessage = channel.send("<@" + user.id + "> has requested to close this ticket. React with ✅ to close it.");
      (await botMessage).react('✅');
    }
  }
  if (reaction.emoji.name === '✅') {
    const { channel } = reaction.message;
    if (channel.name.startsWith('ticket-')) {
      await channel.delete('User requested deletion via reaction');
      console.log(`Deleted channel ${channel.name}`);
    }
  }
});

client.login('MTE2OTI5MjA2NDYzOTQzMDY3Nw.GnO5X8.xRVVUeZWJjM6cea5jvZTgwTau_eyuRkMUR9dpM');