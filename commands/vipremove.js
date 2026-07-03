/**
 * COMANDO: rx!vipremove [id] @cargo
 * Remove um cargo extra que o VIP setou
 */

const { EmbedBuilder } = require('discord.js');
const VipModel = require('../models/VipModel');
const { canUseVipCommand } = require('../utils/permissions');
const { createErrorEmbed, createSuccessEmbed, createBenefitRemovedEmbed } = require('../utils/embeds');
const { sendAndDelete } = require('../utils/messages');
const config = require('../config.json');

module.exports = {
  name: 'vipremove',
  description: 'Remove um cargo extra que você setou',
  async execute(message, args) {
    try {
      // ====== VERIFICAÇÕES INICIAIS ======
      
      // Verificar se é VIP autorizado
      const hasVip = await canUseVipCommand(message.author.id);
      if (!hasVip) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Não é VIP',
            'Apenas usuários com VIP autorizado podem usar este comando.'
          )]
        });
      }
      
      // Verificar argumentos
      if (args.length < 2) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Uso Incorreto',
            'Use: `rx!vipremove [id_do_usuário] @cargo`'
          )]
        });
      }
      
      // ====== PROCESSAR ARGUMENTOS ======
      
      const targetUserId = args[0].replace(/\D/g, '');
      
      // Validar ID do usuário
      if (!targetUserId || targetUserId.length === 0) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'ID Inválido',
            'Por favor, forneça um ID de usuário válido.'
          )]
        });
      }
      
      // Obter cargo mencionado
      let benefitType = null;
      if (message.mentions.roles.size > 0) {
        const role = message.mentions.roles.first();
        
        // Verificar se é um cargo de benefício válido
        for (const [benefit, roleId] of Object.entries(config.cargosBeneficios)) {
          if (role.id === roleId) {
            benefitType = benefit;
            break;
          }
        }
        
        if (!benefitType) {
          return await sendAndDelete(message, {
            embeds: [createErrorEmbed(
              'Cargo Inválido',
              'O cargo mencionado não é um cargo de benefício válido.'
            )]
          });
        }
      } else {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Cargo Não Mencionado',
            'Por favor, mencione um cargo de benefício (@cargo).'
          )]
        });
      }
      
      // ====== VERIFICAR PERMISSÃO ======
      
      const benefit = await VipModel.getBenefit(targetUserId, benefitType, message.author.id);
      
      if (!benefit) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Benefício Não Encontrado',
            'Este usuário não possui este benefício.'
          )]
        });
      }
      
      // Verificar se foi o mesmo que setou
      if (benefit.grantedByUserId !== message.author.id) {
        await VipModel.addLog('permission_error', {
          userId: message.author.id,
          targetUserId,
          benefitType,
          action: 'Tentou remover benefício que não setou'
        });
        
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Permissão Negada',
            'Você só pode remover benefícios que você setou.'
          )]
        });
      }
      
      // ====== REMOVER BENEFÍCIO ======
      
      const guild = message.guild;
      let targetMember;
      
      try {
        targetMember = await guild.members.fetch(targetUserId);
      } catch (err) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Usuário Não Encontrado',
            'Não consegui encontrar o usuário no servidor.'
          )]
        });
      }
      
      // Remover cargo de benefício
      try {
        const benefitRoleId = config.cargosBeneficios[benefitType];
        if (benefitRoleId) {
          await targetMember.roles.remove(benefitRoleId);
        }
      } catch (err) {
        console.error('❌ Erro ao remover cargo de benefício:', err);
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Erro ao Remover Cargo',
            'Não consegui remover o cargo. Verifique minhas permissões.'
          )]
        });
      }
      
      // Remover do banco de dados
      const result = await VipModel.removeBenefit(targetUserId, benefitType, message.author.id);
      
      if (!result.success) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Erro no Banco de Dados',
            result.error || 'Erro ao remover benefício do banco de dados.'
          )]
        });
      }
      
      // Registrar log
      await VipModel.addLog('benefit_removed', {
        userId: message.author.id,
        targetUserId,
        benefitType,
        action: `Benefício ${benefitType} removido`
      });
      
      // ====== RESPONDER COM SUCESSO ======
      
      const successEmbed = createBenefitRemovedEmbed(targetUserId, benefitType);
      
      await sendAndDelete(message, {
        embeds: [successEmbed]
      });
      
      // Enviar log no canal de logs
      const logChannel = guild.channels.cache.get(config.canalLogsVip);
      if (logChannel) {
        const vip = await VipModel.getVip(message.author.id);
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#E67E22')
              .setTitle('📝 Log: Benefício Removido')
              .addFields(
                { name: 'VIP', value: `<@${message.author.id}>`, inline: true },
                { name: 'Tipo VIP', value: vip.vipType.charAt(0).toUpperCase() + vip.vipType.slice(1), inline: true },
                { name: 'Usuário', value: `<@${targetUserId}>`, inline: true },
                { name: 'Benefício', value: benefitType, inline: true }
              )
              .setTimestamp()
          ]
        });
      }
      
    } catch (err) {
      console.error('❌ Erro no comando vipremove:', err);
      await sendAndDelete(message, {
        embeds: [createErrorEmbed(
          'Erro',
          'Ocorreu um erro ao executar o comando.'
        )]
      });
    }
  }
};
