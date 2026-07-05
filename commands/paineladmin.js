const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'paineladmin',
  description: 'Painel administrativo para usuários autorizados',
  async execute(message) {
    try {
      if (!message.member.roles.cache.has(config.setVipRoleId || config.cargoStaffAutorizado)) {
        return message.reply('Você não tem acesso ao painel administrativo.');
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🛠️ Painel Administrativo')
        .setDescription('Use os botões abaixo para gerenciar VIPs sem comandos.');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_add_vip').setLabel('Adicionar VIP').setEmoji('➕').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('admin_remove_vip').setLabel('Remover VIP').setEmoji('➖').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('admin_renew_vip').setLabel('Renovar VIP').setEmoji('🔄').setStyle(ButtonStyle.Primary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_search_vip').setLabel('Pesquisar VIP').setEmoji('🔍').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_list_vips').setLabel('Listar VIPs ativos').setEmoji('📋').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_near_vips').setLabel('Próximos do vencimento').setEmoji('⏰').setStyle(ButtonStyle.Secondary)
      );
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_stats').setLabel('Estatísticas').setEmoji('📊').setStyle(ButtonStyle.Secondary)
      );

      const sent = await message.channel.send({ embeds: [embed], components: [row, row2, row3] });
      return sent;
    } catch (err) {
      console.error('❌ Erro ao abrir painel admin:', err);
    }
  }
};
