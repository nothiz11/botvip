/**
 * COMANDO: rx!vipinfo [id]
 * Exibe informações detalhadas de um VIP.
 */

const VipModel = require('../models/VipModel');
const { createErrorEmbed, createInfoEmbed } = require('../utils/embeds');
const { sendAndDelete } = require('../utils/messages');
const config = require('../config.json');
const { isAuthorizedStaff } = require('../utils/permissions');

module.exports = {
  name: 'vipinfo',
  description: 'Mostra informações detalhadas de um VIP',
  async execute(message, args) {
    try {
      if (!isAuthorizedStaff(message.member)) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed('Permissão Negada', 'Apenas staff autorizado pode consultar VIPs.')]
        });
      }

      const userId = (args[0] || '').replace(/\D/g, '');
      if (!userId) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed('Uso Incorreto', `Use: ${config.prefix}vipinfo [id_do_usuário]`)]
        });
      }

      const vip = await VipModel.getVip(userId);
      if (!vip) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed('Sem VIP', 'Este usuário não possui VIP ativo no momento.')]
        });
      }

      const call = await VipModel.getCallByOwner(userId);
      const embed = createInfoEmbed('Informações do VIP', 'Detalhes do plano e da call vinculada.', [
        { name: 'Usuário', value: `<@${userId}>`, inline: true },
        { name: 'Plano', value: vip.vipType, inline: true },
        { name: 'Status', value: 'Ativo', inline: true },
        { name: 'Dias restantes', value: `${Math.max(0, Math.ceil((new Date(vip.expirationDate) - new Date()) / 86400000))}`, inline: true },
        { name: 'Data da compra', value: new Date(vip.startDate).toLocaleDateString('pt-BR'), inline: true },
        { name: 'Data de vencimento', value: new Date(vip.expirationDate).toLocaleDateString('pt-BR'), inline: true },
        { name: 'Renovações', value: String(vip.renewals || 0), inline: true },
        { name: 'Nome da Call', value: call?.name || 'Sem call', inline: true },
        { name: 'ID da Call', value: String(call?.id || 'N/A'), inline: true },
        { name: 'Cargo da Call', value: call?.roleId || 'Sem cargo', inline: true },
        { name: 'Privacidade', value: call?.privacy || 'public', inline: true },
        { name: 'Quantidade de convidados', value: String(call?.guestCount || 0), inline: true },
        { name: 'Data de criação da Call', value: call ? new Date(call.createdAt).toLocaleDateString('pt-BR') : 'N/A', inline: true },
        { name: 'Última alteração', value: call ? new Date(call.updatedAt).toLocaleDateString('pt-BR') : 'N/A', inline: true }
      ]);

      await sendAndDelete(message, { embeds: [embed] });
    } catch (err) {
      console.error('❌ Erro no comando vipinfo:', err);
      await sendAndDelete(message, { embeds: [createErrorEmbed('Erro', 'Ocorreu um erro ao consultar o VIP.')] });
    }
  }
};
