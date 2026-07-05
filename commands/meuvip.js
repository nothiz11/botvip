const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const VipModel = require('../models/VipModel');

module.exports = {
  name: 'meuvip',
  description: 'Mostra o painel Meu VIP',
  async execute(message) {
    try {
      const vip = await VipModel.getVip(message.author.id);
      if (!vip) {
        return message.channel.send('Você não possui VIP ativo.');
      }

      const call = await VipModel.getCallByOwner(message.author.id);
      const backup = await VipModel.getLatestBackup(message.author.id);
      const daysLeft = Math.max(0, Math.ceil((new Date(vip.expirationDate) - new Date()) / 86400000));

      const embed = new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle('<:splitanimage1:1495814262835122206><:splitanimage2:1495814283693658152><:splitanimage3:1495814299963363369> Meu VIP')
        .setDescription('Resumo claro do seu plano e da sua call privada.')
        .addFields(
          { name: '<:membro:1495571715617460264> Perfil', value: `Plano: **${vip.vipType}**\nStatus: **Ativo**\nDias restantes: **${daysLeft}**\nData da compra: **${new Date(vip.startDate).toLocaleDateString('pt-BR')}**\nVencimento: **${new Date(vip.expirationDate).toLocaleDateString('pt-BR')}**\nID VIP: **${vip.userId}**`, inline: false },
          { name: '━━━━━━━━━━━━', value: ' ', inline: false },
          { name: '<:global_StorM:1495569937614241913> Call', value: `Status: **${call ? 'Ativa' : 'Sem call'}**\nNome: **${call?.name || 'Sem call'}**\nCargo: **${call?.roleId ? `<@&${call.roleId}>` : 'Sem cargo'}**\nPrivacidade: **${call?.privacy || 'public'}**\nConvidados: **${call?.guestCount || 0}**\nLimite: **${call?.limitNumber || 5}**`, inline: false },
          { name: '━━━━━━━━━━━━', value: ' ', inline: false },
          { name: '<:rocket:1495830214775803957> Estatísticas', value: `Renovações: **${vip.renewals || 0}**\nCriada em: **${call ? new Date(call.createdAt).toLocaleDateString('pt-BR') : 'N/A'}**\nÚltima alteração: **${call ? new Date(call.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}**`, inline: false },
          { name: '━━━━━━━━━━━━', value: ' ', inline: false },
          { name: '<:emoji_91:1495569481001472113> Backup', value: backup ? '✅ Disponível' : '⚪ Não disponível', inline: false }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(call ? `call_manage_${call.id}` : 'create_my_call').setLabel(call ? 'Gerenciar Call' : 'Criar Minha Call').setEmoji(call ? '<:commit:1470816458547265678>' : '🎧').setStyle(call ? ButtonStyle.Primary : ButtonStyle.Success),
        new ButtonBuilder().setCustomId(call ? `call_backup_${call.id}` : `call_backup_${message.author.id}`).setLabel('Carregar Backup').setEmoji('<:emoji_91:1495569481001472113>').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(call ? `call_privacy_${call.id}` : `call_privacy_${message.author.id}`).setLabel('Privacidade').setEmoji('<:7619planet:1495818283042210034>').setStyle(ButtonStyle.Secondary)
      );

      await message.channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('❌ Erro ao abrir Meu VIP:', err);
    }
  }
};
