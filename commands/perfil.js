/**
 * COMANDO: rx!perfil [id|@usuario]
 * Mostra o VIP do usuário, quem setou os benefícios e quanto tempo falta para expirar.
 */

const VipModel = require('../models/VipModel');
const { createErrorEmbed, createVipProfileEmbed } = require('../utils/embeds');
const { sendAndDelete } = require('../utils/messages');

module.exports = {
  name: 'perfil',
  description: 'Exibe o perfil VIP do usuário.',
  async execute(message, args) {
    try {
      let userId = message.author.id;

      if (args.length > 0) {
        const mention = message.mentions.users.first();
        if (mention) {
          userId = mention.id;
        } else {
          const idCandidate = args[0].replace(/\D/g, '');
          if (!idCandidate) {
            return await sendAndDelete(message, {
              embeds: [createErrorEmbed(
                'ID Inválido',
                'Por favor, forneça um ID de usuário válido ou mencione um usuário.'
              )]
            });
          }
          userId = idCandidate;
        }
      }

      const vip = await VipModel.getVip(userId);
      if (!vip) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Sem VIP',
            'Este usuário não possui VIP ativo no momento.'
          )]
        });
      }

      const benefits = await VipModel.getUserBenefits(userId);
      const profileEmbed = createVipProfileEmbed(userId, vip.vipType, vip.expirationDate, benefits);

      await sendAndDelete(message, {
        embeds: [profileEmbed]
      }, 10000, false);
    } catch (err) {
      console.error('❌ Erro no comando perfil:', err);
      await sendAndDelete(message, {
        embeds: [createErrorEmbed(
          'Erro',
          'Ocorreu um erro ao buscar o perfil VIP.'
        )]
      });
    }
  }
};
