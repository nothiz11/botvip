/**
 * COMANDO: rx!vipcl [quantidade]
 * Apaga mensagens do próprio usuário (apenas VIPs autorizados)
 */

const VipModel = require('../models/VipModel');
const { canUseVipCommand } = require('../utils/permissions');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');
const { sendAndDelete } = require('../utils/messages');

module.exports = {
  name: 'vipcl',
  description: 'Apaga mensagens do próprio usuário',
  async execute(message, args) {
    try {
      // ====== VERIFICAÇÕES INICIAIS ======
      
      // Verificar se é VIP autorizado para usar vipcl
      const hasVip = await canUseVipCommand(message.author.id);
      if (!hasVip) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Não é VIP',
            'Apenas VIPs autorizados podem usar este comando.'
          )]
        });
      }
      
      // Verificar se o VIP pode usar vipcl (Clickbait não pode)
      const vip = await VipModel.getVip(message.author.id);
      if (vip.vipType === 'clickbait') {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Não Autorizado',
            'Você não tem permissão para usar este comando.'
          )]
        });
      }
      
      // Verificar argumentos
      if (args.length < 1) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Uso Incorreto',
            'Use: `rx!vipcl [quantidade]`'
          )]
        });
      }
      
      // ====== PROCESSAR ARGUMENTOS ======
      
      const quantity = parseInt(args[0]);
      
      // Validar quantidade
      if (isNaN(quantity) || quantity < 1) {
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Quantidade Inválida',
            'Por favor, forneça um número válido (mínimo 1).'
          )]
        });
      }
      
      // Limitar a 100 mensagens
      const deleteCount = Math.min(quantity, 100);
      
      // ====== DELETAR MENSAGENS ======
      
      try {
        // Buscar mensagens no canal
        const messages = await message.channel.messages.fetch({ limit: deleteCount + 1 });
        
        // Filtrar apenas mensagens do usuário
        const userMessages = messages.filter(msg => msg.author.id === message.author.id).first(deleteCount);
        
        if (userMessages.length === 0) {
          return await sendAndDelete(message, {
            embeds: [createErrorEmbed(
              'Nenhuma Mensagem',
              'Nenhuma mensagem sua foi encontrada para apagar.'
            )]
          });
        }
        
        // Deletar mensagens
        for (const msg of userMessages) {
          try {
            await msg.delete();
          } catch (err) {
            console.error('❌ Erro ao deletar mensagem:', err);
          }
        }
        
        // Registrar log
        await VipModel.addLog('vipcl_used', {
          userId: message.author.id,
          vipType: vip.vipType,
          action: `${userMessages.length} mensagens deletadas`,
          details: { channelId: message.channel.id, quantity: userMessages.length }
        });
        
        // ====== RESPONDER COM SUCESSO ======
        
        await sendAndDelete(message, {
          embeds: [createSuccessEmbed(
            'Mensagens Deletadas',
            `✅ ${userMessages.length} mensagem(ns) foi/foram deletada(s) com sucesso.`
          )]
        });
        
      } catch (err) {
        console.error('❌ Erro ao deletar mensagens:', err);
        return await sendAndDelete(message, {
          embeds: [createErrorEmbed(
            'Erro ao Deletar',
            'Ocorreu um erro ao deletar as mensagens.'
          )]
        });
      }
      
    } catch (err) {
      console.error('❌ Erro no comando vipcl:', err);
      await sendAndDelete(message, {
        embeds: [createErrorEmbed(
          'Erro',
          'Ocorreu um erro ao executar o comando.'
        )]
      });
    }
  }
};
