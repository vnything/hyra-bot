const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRequirementForMember } = require('../lib/rank');
const { resolvePersonActivity } = require('../lib/resolve');
const { sumMessagesForDates, getDailyMessages } = require('../lib/storage');
const { getWeekStart, getWeekDates } = require('../lib/dates');
const { durationToMinutes } = require('../lib/hyra');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription("Check a staff member's current-week activity against their rank requirement")
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
    if (!requirement) {
      return interaction.editReply(
        `⚠️ ${member} doesn't have any of the configured rank roles, so I can't check a requirement for them.`
      );
    }

    const weekStart = getWeekStart();
    const weekDates = getWeekDates(weekStart);
    const weeklyMessages = sumMessagesForDates(targetUser.id, weekDates);

    const minutesMet = activity.totals.minutes >= requirement.minutes;
    const messagesMet = weeklyMessages >= requirement.messages;
    const overallMet = minutesMet && messagesMet;

    const recentSessions =
      (activity.last_25 || [])
        .slice(0, 10)
        .map((s) => {
          const date = new Date(s.start).toLocaleString('en-US', {
            timeZone: 'America/New_York',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
          return `📅 ${date} — ⏱️ ${durationToMinutes(s.duration)} min`;
        })
        .join('\n') || 'No recent sessions found.';

    const embed = new EmbedBuilder()
      .setTitle(`Activity Report — ${robloxUsername}`)
      .setColor(overallMet ? 0x57f287 : 0xed4245)
      .addFields(
        { name: 'Rank', value: requirement.role, inline: true },
        {
          name: 'This Week (Minutes)',
          value: `${activity.totals.minutes} / ${requirement.minutes} min ${minutesMet ? '✅' : '❌'}`,
          inline: true,
        },
        {
          name: 'This Week (Messages)',
          value: `${weeklyMessages} / ${requirement.messages} msgs ${messagesMet ? '✅' : '❌'}`,
          inline: true,
        },
        { name: 'Overall Status', value: overallMet ? '✅ Requirement met' : '❌ Below requirement' },
        { name: 'Recent Sessions', value: recentSessions }
      )
      .setFooter({ text: `Week starts on: ${activity.week_starts_on || 'unknown'} • Times shown in US Eastern` });

    return interaction.editReply({ embeds: [embed] });
  },
};
