const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasAnyRankRole, getRequirementForMember } = require('../lib/rank');
const { sumMessagesForDates } = require('../lib/storage');
const { getWeekStart, getWeekDates } = require('../lib/dates');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top 10 staff (Airport Assistant-Director) by Discord messages this week'),

  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    await guild.members.fetch(); // ensure full member cache (requires GuildMembers intent)

    const weekDates = getWeekDates(getWeekStart());

    const ranked = guild.members.cache.filter((m) => !m.user.bot && hasAnyRankRole(m));

    const scored = ranked.map((member) => {
      const requirement = getRequirementForMember(member);
      const messages = sumMessagesForDates(member.id, weekDates);
      return { member, requirement, messages };
    });

    scored.sort((a, b) => b.messages - a.messages);
    const top10 = scored.slice(0, 10);

    if (top10.length === 0) {
      return interaction.editReply('No members with a configured rank role were found in this server.');
    }

    const lines = top10.map((entry, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
      return `${medal} ${entry.member} — **${entry.messages}** messages (${entry.requirement.role})`;
    });

    const embed = new EmbedBuilder()
      .setTitle('📊 Discord Message Leaderboard — This Week')
      .setColor(0xfee75c)
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Based on messages sent in the general-lounge channel • US Eastern Time' });

    return interaction.editReply({ embeds: [embed] });
  },
};
