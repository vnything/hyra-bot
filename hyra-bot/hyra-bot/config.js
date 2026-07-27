module.exports = {
  TIMEZONE: 'America/New_York', // auto-adjusts EST/EDT

  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID || '822819367070597131',

  HYRA_API_KEY: process.env.HYRA_API_KEY,
  HYRA_WORKSPACE_ID: process.env.HYRA_WORKSPACE_ID || '65942a0c733a251d468d6b53',

  GENERAL_LOUNGE_CHANNEL_ID: process.env.GENERAL_LOUNGE_CHANNEL_ID || '825046860409995284',

  // Cron time to snapshot weekly minutes + prune old daily message data.
  // Runs in TIMEZONE above. Default: Monday 00:00.
  // Check the {week_starts_on} field shown in command replies and adjust the day (0-6, Sun-Sat) if needed.
  RESET_CRON: process.env.RESET_CRON || '0 0 * * 1',

  // How many days of daily message history to keep (12 weeks + buffer)
  DAILY_HISTORY_RETENTION_DAYS: 100,

  // How many weekly minute snapshots to retain per Roblox user
  WEEKLY_HISTORY_LIMIT: 12,

  // Rank -> weekly requirement. Order matters: first role match in a member's roles wins.
  RANK_REQUIREMENTS: [
    { role: 'Airport Manager', minutes: 75, messages: 75 },
    { role: 'Airport Assistant', minutes: 75, messages: 75 },
    { role: 'Airport Coordinator', minutes: 60, messages: 50 },
    { role: 'Airport Director', minutes: 30, messages: 30 },
  ],
};
