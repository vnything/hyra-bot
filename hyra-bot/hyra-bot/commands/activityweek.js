const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRequirementForMember } = require('../lib/rank');
const { resolvePersonActivity } = require('../lib/resolve');
const { getDailyMessages } = require('../lib/storage');
const { getWeekStart, getWeekDates } = require('../lib/dates');
const { durationToMinutes } = require('../lib/hyra');

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Buckets this week's Hyra sessions (last_25) into per-day minute totals (EST/EDT calendar days).
function getMinutesPerDay(activity, weekDates) {
  const totals = {};
  weekDates.forEach((d) => (totals[d] = 0));
  for (const session of activity.last_25 || []) {
    const dateStr = new Date(session.start).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    if (totals[dateStr] !== undefined) {
      totals[dateStr] += durationToMinutes(session.duration);
    }
  }
  return totals;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activityweek')
    .setDescription('Per-day breakdown of this week: Discord messages + Hyra minutes')
    .addStringOption((opt) =>
      opt.setName('roblox_username').setDescription('Their Roblox username').setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName('member').setDescription('The Discord member to check (defaults to yourself)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const robloxUsername = interaction.options.getString('roblox_username');
    const targetUser = interaction.options.getUser('member') || interaction.user;

    let member;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch (err) {
      return interaction.editReply('❌ Could not find that member in this server.');
    }

    const result = await resolvePersonActivity(robloxUsername, targetUser.id);
    if (result.error) return interaction.editReply(`❌ ${result.error}`);
    const { activity } = result;

    const requirement = getRequirementForMember(member);

    const weekStart = getWeekStart();
    const weekDates = getWeekDates(weekStart);
    const dailyMessages = getDailyMessages(targetUser.id);
    const minutesPerDay = getMinutesPerDay(activity, weekDates);

    let totalMessages = 0;
    let totalMinutes = 0;
    const lines = weekDates.map((dateStr, i) => {
      const msgs = dailyMessages[dateStr] || 0;
      const mins = minutesPerDay[dateStr] || 0;
      totalMessages += msgs;
      totalMinutes += mins;
      const label = DAY_LABELS[i];
      const isToday = dateStr === weekDates[weekDates.length - 1] && false; // placeholder, not used
      return `**${label}** (${dateStr}) — 💬 ${msgs} msgs | ⏱️ ${mins} min`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`Weekly Breakdown — ${robloxUsername}`)
      .setColor(0x5865f2)
      .setDescription(lines.join('\n'))
      .addFields({
        name: 'Week Total',
        value: `💬 ${totalMessages} messages | ⏱️ ${totalMinutes} minutes (day-bucketed; may differ slightly from Hyra's own total due to sessions crossing midnight)`,
      });

    if (requirement) {
      const minutesMet = activity.totals.minutes >= requirement.minutes;
      const messagesMet = totalMessages >= requirement.messages;
      embed.addFields({
        name: `Requirement (${requirement.role})`,
        value: `${activity.totals.minutes}/${requirement.minutes} min ${minutesMet ? '✅' : '❌'} | ${totalMessages}/${requirement.messages} msgs ${messagesMet ? '✅' : '❌'}`,
      });
    }

    embed.setFooter({ text: 'All days shown in US Eastern Time (auto-adjusts for DST)' });

    return interaction.editReply({ embeds: [embed] });
  },
};
