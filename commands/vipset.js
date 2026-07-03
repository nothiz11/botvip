/**
 * COMANDO: rx!vipset [id] @cargo
 * Define um cargo extra para outro usuário (apenas VIPs autorizados)
 */

const { EmbedBuilder } = require('discord.js');
const VipModel = require('../models/VipModel');
const { canUseVipCommand, canSetBenefit, checkBenefitLimit } = require('../utils/permissions');
const { createErrorEmbed, createSuccessEmbed, createBenefitAddedEmbed } = require('../utils/embeds');
const { sendAndDelete } = require('../utils/messages');
const config = require('../config.json');

// Mapeamento de cargos de benefício
const BENEFIT_ROLES = {
  'img': 'img',
  '/img': 'img',
  'imperial': 'imperial',
  'antban': 'antban',
  '/antban': 'antban'
};

module.exports = {
  name: 'vipset',
  description: 'Define um cargo extra para outro usuário',
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
            'Use: `rx!vipset [id_do_usuário] @cargo`'
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
      
      // ====== VERIFICAR PERMISSÕES ======
      
      const permission = await canSetBenefit(message.author.id, benefitType);
      if (!permission.allowed) {
        // Registrar log de erro de permissão
        await VipModel.addLog('permission_error', {
          userId: message.author.id,
          targetUserId,
          benefitType,
          action: 'Tentou setar benefício sem permissão'
        });
        
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Permissão Negada',
            permission.reason
          )]
        });
      }
      
      // ====== VERIFICAR LIMITE ======
      
      const limitCheck = await checkBenefitLimit(message.author.id, benefitType);
      if (!limitCheck.withinLimit) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Limite Atingido',
            'Você já atingiu o limite desse benefício. Remova de alguém antes de setar em outra pessoa.'
          )]
        });
      }
      
      // ====== ADICIONAR BENEFÍCIO ======
      
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
      
      // Adicionar cargo de benefício
      try {
        const benefitRoleId = config.cargosBeneficios[benefitType];
        if (benefitRoleId) {
          await targetMember.roles.add(benefitRoleId);
        }
      } catch (err) {
        console.error('❌ Erro ao adicionar cargo de benefício:', err);
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Erro ao Adicionar Cargo',
            'Não consegui adicionar o cargo. Verifique minhas permissões.'
          )]
        });
      }
      
      // Adicionar no banco de dados
      const result = await VipModel.addBenefit(targetUserId, message.author.id, benefitType);
      
      if (!result.success) {
        // Se falhar, remover o cargo
        await targetMember.roles.remove(config.cargosBeneficios[benefitType]);
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Erro no Banco de Dados',
            result.error || 'Erro ao salvar benefício no banco de dados.'
          )]
        });
      }
      
      // Registrar log
      await VipModel.addLog('benefit_added', {
        userId: message.author.id,
        targetUserId,
        benefitType,
        action: `Benefício ${benefitType} setado`
      });
      
      // ====== RESPONDER COM SUCESSO ======
      
      const successEmbed = createBenefitAddedEmbed(targetUserId, message.author.id, benefitType);
      
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
              .setColor('#9B59B6')
              .setTitle('📝 Log: Benefício Adicionado')
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
      console.error('❌ Erro no comando vipset:', err);
      await sendAndDelete(message, {
        embeds: [createErrorEmbed(
          'Erro',
          'Ocorreu um erro ao executar o comando.'
        )]
      });
    }
  }
};
