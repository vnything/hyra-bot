const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hyraGetStaffDashboard, hyraGetActivity } = require('../lib/hyra');
const { getAllTrackedUsers } = require('../lib/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxleaderboard')
    .setDescription('Top 10 Roblox activity (minutes) this week, via Hyra'),

  async execute(interaction) {
    await interaction.deferReply();

    const results = new Map(); // hyraUserId -> { username, minutes }

    // 1. Seed with Hyra's own verified top 6 (from the staff dashboard endpoint)
    const dashboard = await hyraGetStaffDashboard();
    if (dashboard && Array.isArray(dashboard.top_six)) {
      for (const entry of dashboard.top_six) {
        results.set(entry._id, { username: entry.username, minutes: entry.total });
      }
    }

    // 2. Fill in with everyone the bot has ever looked up via /activity, /activityweek, /activityoverall,
    //    so the ranking isn't limited to just the top 6 if those people have also been active.
    const tracked = getAllTrackedUsers();
    const trackedEntries = Object.values(tracked);

    for (const entry of trackedEntries) {
      if (results.has(entry.hyraUserId)) continue; // already have it from the dashboard
      const activity = await hyraGetActivity(entry.hyraUserId);
      if (activity && activity.totals) {
        results.set(entry.hyraUserId, { username: entry.robloxUsername, minutes: activity.totals.minutes });
      }
      // Small delay to stay well within Hyra's rate limit (100 req/min)
      await new Promise((r) => setTimeout(r, 150));
    }

    const sorted = Array.from(results.values()).sort((a, b) => b.minutes - a.minutes);
    const top10 = sorted.slice(0, 10);

    if (top10.length === 0) {
      return interaction.editReply('No activity data available yet. Have some staff run `/activity` at least once.');
    }

    const lines = top10.map((entry, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
      return `${medal} **${entry.username}** — ${entry.minutes} minutes`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🎮 Roblox Activity Leaderboard — This Week')
      .setColor(0x57f287)
      .setDescription(lines.join('\n'))
      .setFooter({
        text: "Combines Hyra's top 6 with everyone the bot has looked up before — not a guaranteed full-workspace top 10 until most staff have used a command at least once. US Eastern Time.",
      });

    return interaction.editReply({ embeds: [embed] });
  },
};
