require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');

const config = require('./config');
const { recordMessage, pruneOldDailyMessages, getAllTrackedUsers, recordWeeklyMinutesSnapshot } = require('./lib/storage');
const { hyraGetActivity } = require('./lib/hyra');
const { getWeekStart, addDays } = require('./lib/dates');

// ---------- Load commands ----------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
  const body = client.commands.map((c) => c.data.toJSON());
  await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body });
  console.log(`Registered ${body.length} slash commands.`);
}

// ---------- Weekly maintenance: snapshot minutes history + prune old daily data ----------

async function runWeeklyMaintenance() {
  console.log(`[${new Date().toISOString()}] Running weekly maintenance...`);

  // The week that just ENDED is the previous week relative to the new week that's starting now.
  const justEndedWeekStart = addDays(getWeekStart(), -7);

  const tracked = getAllTrackedUsers();
  for (const [discordUserId, entry] of Object.entries(tracked)) {
    try {
      const activity = await hyraGetActivity(entry.hyraUserId);
      if (activity && activity.totals) {
        recordWeeklyMinutesSnapshot(entry.robloxUsername, justEndedWeekStart, activity.totals.minutes);
      }
    } catch (err) {
      console.error(`Failed to snapshot minutes for ${entry.robloxUsername}:`, err.message);
    }
    await new Promise((r) => setTimeout(r, 150)); // gentle on Hyra's rate limit
  }

  pruneOldDailyMessages();
  console.log('Weekly maintenance complete.');
}

// ---------- Events ----------

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.guildId !== config.GUILD_ID) return;
  if (message.channelId !== config.GENERAL_LOUNGE_CHANNEL_ID) return;
  recordMessage(message.author.id, message.createdAt);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const payload = { content: '❌ Something went wrong running that command.' };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
    }
  }
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();

  cron.schedule(config.RESET_CRON, runWeeklyMaintenance, { timezone: config.TIMEZONE });
  console.log(`Weekly maintenance scheduled: "${config.RESET_CRON}" (${config.TIMEZONE})`);
});

client.login(config.DISCORD_TOKEN);
