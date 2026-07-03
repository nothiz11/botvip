/**
 * COMANDO: rx!addvip [id] @cargo
 * Adiciona VIP a um usuário (apenas staff autorizado)
 */

const { EmbedBuilder } = require('discord.js');
const VipModel = require('../models/VipModel');
const { isAuthorizedStaff } = require('../utils/permissions');
const { createSuccessEmbed, createErrorEmbed, createVipAddedEmbed } = require('../utils/embeds');
const { sendAndDelete } = require('../utils/messages');
const config = require('../config.json');

module.exports = {
  name: 'addvip',
  description: 'Adiciona VIP a um usuário',
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
      if (args.length < 2) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Uso Incorreto',
            'Use: `rx!addvip [id_do_usuário] @cargo_vip`'
          )]
        });
      }
      
      // ====== PROCESSAR ARGUMENTOS ======
      
      const userId = args[0].replace(/\D/g, '');
      
      // Validar ID do usuário
      if (!userId || userId.length === 0) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'ID Inválido',
            'Por favor, forneça um ID de usuário válido.'
          )]
        });
      }
      
      // Obter cargo mencionado
      let vipType = null;
      if (message.mentions.roles.size > 0) {
        const role = message.mentions.roles.first();
        
        // Verificar se é um cargo VIP válido
        for (const [type, roleId] of Object.entries(config.cargosVip)) {
          if (role.id === roleId) {
            vipType = type;
            break;
          }
        }
        
        if (!vipType) {
          return await sendAndDelete(message, {
            embeds: [createErrorEmbed(
              'Cargo Inválido',
              'O cargo mencionado não é um cargo VIP válido.'
            )]
          });
        }
      } else {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Cargo Não Mencionado',
            'Por favor, mencione um cargo VIP (@cargo).'
          )]
        });
      }
      
      // ====== TENTAR ADICIONAR VIP ======
      
      // Obter guild e member
      const guild = message.guild;
      let targetMember;
      try {
        targetMember = await guild.members.fetch(userId);
      } catch (err) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Usuário Não Encontrado',
            'Não consegui encontrar o usuário no servidor.'
          )]
        });
      }
      
      // Adicionar cargo VIP
      try {
        await targetMember.roles.add(config.cargosVip[vipType]);
      } catch (err) {
        console.error('❌ Erro ao adicionar cargo:', err);
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Erro ao Adicionar Cargo',
            'Não consegui adicionar o cargo. Verifique minhas permissões.'
          )]
        });
      }
      
      // Adicionar no banco de dados
      const result = await VipModel.addVip(userId, vipType);
      
      if (!result.success) {
        // Se falhar, remover o cargo
        await targetMember.roles.remove(config.cargosVip[vipType]);
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Erro no Banco de Dados',
            result.error || 'Erro ao salvar VIP no banco de dados.'
          )]
        });
      }
      
      // Registrar log
      await VipModel.addLog('vip_added', {
        userId: message.author.id,
        targetUserId: userId,
        vipType: vipType,
        action: 'VIP adicionado por staff'
      });
      
      // ====== RESPONDER COM SUCESSO ======
      
      const successEmbed = createVipAddedEmbed(userId, vipType, result.expiration);
      
      await sendAndDelete(message, {
        embeds: [successEmbed]
      });
      
      // Enviar log no canal de logs
      const logChannel = guild.channels.cache.get(config.canalLogsVip);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('📝 Log: VIP Adicionado')
              .addFields(
                { name: 'Staff', value: `<@${message.author.id}>`, inline: true },
                { name: 'Usuário', value: `<@${userId}>`, inline: true },
                { name: 'VIP', value: vipType.charAt(0).toUpperCase() + vipType.slice(1), inline: false },
                { name: 'Expira em', value: new Date(result.expiration).toLocaleDateString('pt-BR'), inline: false }
              )
              .setTimestamp()
          ]
        });
      }
      
    } catch (err) {
      console.error('❌ Erro no comando addvip:', err);
      await sendAndDelete(message, {
        embeds: [createErrorEmbed(
          'Erro',
          'Ocorreu um erro ao executar o comando.'
        )]
      });
    }
  }
};
