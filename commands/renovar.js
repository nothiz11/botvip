/**
 * COMANDO: rx!renovar [id]
 * Renova o VIP do usuário por mais 30 dias.
 */

const VipModel = require('../models/VipModel');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');
const { sendAndDelete } = require('../utils/messages');
const config = require('../config.json');
const { isAuthorizedStaff } = require('../utils/permissions');

module.exports = {
  name: 'renovar',
  description: 'Renova o VIP de um usuário por 30 dias',
  async execute(message, args) {
    try {
      if (!isAuthorizedStaff(message.member)) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed('Permissão Negada', 'Apenas staff autorizado pode renovar VIPs.')]
        });
      }

      const userId = (args[0] || '').replace(/\D/g, '');
      if (!userId) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed('Uso Incorreto', `Use: ${config.prefix}renovar [id_do_usuário]`)]
        });
      }

      const result = await VipModel.renewVip(userId);
      if (!result.success) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed('Erro', result.error || 'Não foi possível renovar o VIP.')]
        });
      }

      const vip = await VipModel.getVip(userId);
      await sendAndDelete(message, {
        embeds: [createSuccessEmbed('VIP Renovado', `O VIP foi renovado até ${new Date(vip.expirationDate).toLocaleDateString('pt-BR')}.`)]
      });
    } catch (err) {
      console.error('❌ Erro no comando renovar:', err);
      await sendAndDelete(message, {
        embeds: [createErrorEmbed('Erro', 'Ocorreu um erro ao renovar o VIP.')]
      });
    }
  }
};
