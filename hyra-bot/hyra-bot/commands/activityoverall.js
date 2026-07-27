const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRequirementForMember } = require('../lib/rank');
const { resolvePersonActivity } = require('../lib/resolve');
const { sumMessagesForDates } = require('../lib/storage');
const { getWeeklyMinutesHistory } = require('../lib/storage');
const { getLastNWeekStarts, getWeekDates, getWeekStart } = require('../lib/dates');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activityoverall')
    .setDescription('Shows the past 12 weeks of activity (messages + minutes)')
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
    const currentWeekStart = getWeekStart();
    const last12Weeks = getLastNWeekStarts(12);
    const minutesHistory = getWeeklyMinutesHistory(robloxUsername);
    const minutesByWeek = Object.fromEntries(minutesHistory.map((e) => [e.weekStart, e.minutes]));

    const lines = last12Weeks.map((weekStart) => {
      const weekDates = getWeekDates(weekStart);
      const messages = sumMessagesForDates(targetUser.id, weekDates);

      let minutesDisplay;
      if (weekStart === currentWeekStart) {
        minutesDisplay = `${activity.totals.minutes} (live)`;
      } else if (minutesByWeek[weekStart] !== undefined) {
        minutesDisplay = `${minutesByWeek[weekStart]}`;
      } else {
        minutesDisplay = 'no data';
      }

      let status = '';
      if (requirement) {
        const minsKnown = weekStart === currentWeekStart || minutesByWeek[weekStart] !== undefined;
        if (minsKnown) {
          const mins = weekStart === currentWeekStart ? activity.totals.minutes : minutesByWeek[weekStart];
          const met = mins >= requirement.minutes && messages >= requirement.messages;
          status = met ? ' ✅' : ' ❌';
        }
      }

      return `**Week of ${weekStart}** — 💬 ${messages} msgs | ⏱️ ${minutesDisplay} min${status}`;
    });

    const oldestTrackedWeek = minutesHistory.length > 0 ? minutesHistory[0].weekStart : currentWeekStart;

    const embed = new EmbedBuilder()
      .setTitle(`12-Week Activity Overview — ${robloxUsername}`)
      .setColor(0x5865f2)
      .setDescription(lines.join('\n'))
      .setFooter({
        text: `Minutes history tracked since week of ${oldestTrackedWeek}. Weeks before that show "no data" since Hyra doesn't expose historical minute totals. US Eastern Time.`,
      });

    if (requirement) {
      embed.addFields({ name: 'Rank Requirement', value: `${requirement.minutes} min / ${requirement.messages} msgs per week (${requirement.role})` });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
