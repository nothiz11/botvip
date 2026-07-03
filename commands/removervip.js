/**
 * COMANDO: rx!removervip [id]
 * Remove VIP de um usuário (apenas staff autorizado)
 */

const { EmbedBuilder } = require('discord.js');
const VipModel = require('../models/VipModel');
const { isAuthorizedStaff } = require('../utils/permissions');
const { createErrorEmbed, createVipRemovedEmbed } = require('../utils/embeds');
const { sendAndDelete } = require('../utils/messages');
const config = require('../config.json');

module.exports = {
  name: 'removervip',
  description: 'Remove VIP de um usuário',
  async execute(message, args) {
    try {
      // ====== VERIFICAÇÕES INICIAIS ======
      
      // Verificar se é staff autorizado
      if (!isAuthorizedStaff(message.member)) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Permissão Negada',
            'Apenas staff autorizado pode usar este comando.'
          )]
        });
      }
      
      // Verificar argumentos
      if (args.length < 1) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Uso Incorreto',
            'Use: `rx!removervip [id_do_usuário]`'
          )]
        });
      }
      
      // ====== PROCESSAR ARGUMENTOS ======
      
      const userId = args[0].replace(/\D/g, '');
      
      // Validar ID do usuário
      if (!userId || userId.length === 0) {
        return await message.reply({
          embeds: [createErrorEmbed(
            'ID Inválido',
            'Por favor, forneça um ID de usuário válido.'
          )]
        });
      }
      
      // ====== OBTER INFORMAÇÕES DO VIP ======
      
      const vip = await VipModel.getVip(userId);
      
      if (!vip) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Não é VIP',
            'Este usuário não é VIP no momento.'
          )]
        });
      }
      
      // ====== REMOVER VIP E BENEFÍCIOS ======
      
      const guild = message.guild;
      let targetMember;
      
      try {
        targetMember = await guild.members.fetch(userId);
      } catch (err) {
        console.error('❌ Erro ao buscar member:', err);
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Usuário Não Encontrado',
            'Não consegui encontrar o usuário no servidor.'
          )]
        });
      }
      
      // Remover cargo VIP
      try {
        const vipRoleId = config.cargosVip[vip.vipType];
        if (vipRoleId) {
          await targetMember.roles.remove(vipRoleId);
        }
      } catch (err) {
        console.error('❌ Erro ao remover cargo VIP:', err);
      }
      
      // Obter benefícios do usuário
      const benefits = await VipModel.getUserBenefits(userId);
      
      // Remover todos os cargos de benefício
      for (const benefit of benefits) {
        try {
          const benefitRoleId = config.cargosBeneficios[benefit.benefitType];
          if (benefitRoleId) {
            await targetMember.roles.remove(benefitRoleId);
          }
        } catch (err) {
          console.error(`❌ Erro ao remover benefício ${benefit.benefitType}:`, err);
        }
      }
      
      // Remover do banco de dados
      const result = await VipModel.removeVip(userId);
      
      if (!result.success) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Erro no Banco de Dados',
            result.error || 'Erro ao remover VIP do banco de dados.'
          )]
        });
      }
      
      // Registrar log
      await VipModel.addLog('vip_removed', {
        userId: message.author.id,
        targetUserId: userId,
        vipType: result.vipType,
        action: 'VIP removido por staff',
        details: { benefitsRemoved: benefits.length }
      });
      
      // ====== RESPONDER COM SUCESSO ======
      
      const successEmbed = createVipRemovedEmbed(userId, result.vipType);
      
      await sendAndDelete(message, {
        embeds: [successEmbed]
      });
      
      // Enviar log no canal de logs
      const logChannel = guild.channels.cache.get(config.canalLogsVip);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#E74C3C')
              .setTitle('📝 Log: VIP Removido')
              .addFields(
                { name: 'Staff', value: `<@${message.author.id}>`, inline: true },
                { name: 'Usuário', value: `<@${userId}>`, inline: true },
                { name: 'VIP Removido', value: result.vipType.charAt(0).toUpperCase() + result.vipType.slice(1), inline: false },
                { name: 'Benefícios Removidos', value: benefits.length.toString(), inline: true }
              )
              .setTimestamp()
          ]
        });
      }
      
    } catch (err) {
      console.error('❌ Erro no comando removervip:', err);
      await sendAndDelete(message, {
        embeds: [createErrorEmbed(
          'Erro',
          'Ocorreu um erro ao executar o comando.'
        )]
      });
    }
  }
};
