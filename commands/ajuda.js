/**
 * COMANDO: rx!ajuda
 * Painel de ajuda com comandos VIP adaptado ao tipo de VIP do usuário
 */

const { EmbedBuilder } = require('discord.js');
const VipModel = require('../models/VipModel');
const config = require('../config.json');

const VIP_HELP = {
  clickbait: {
    title: 'Clickbait',
    description: 'Você não possui comandos VIP.',
    benefits: 'Nenhum benefício extra disponível.'
  },
  chicago: {
    title: 'Chicago',
    description: 'Você pode usar comandos VIP limitados e oferecer 1 benefício de /img.',
    benefits: '• /img em 1 pessoa\n• `rx!vipcl [quantidade]`'
  },
  champagne: {
    title: 'Champagne',
    description: 'Você pode usar comandos VIP limitados com 1 benefício de cada tipo.',
    benefits: '• /img em 1 pessoa\n• /imperial em 1 pessoa\n• `rx!vipcl [quantidade]`'
  },
  ballena: {
    title: 'Ballena',
    description: 'Você pode usar comandos VIP com benefícios maiores e controle de antban.',
    benefits: '• /img em 1 pessoa\n• /imperial em até 2 pessoas\n• /antban em 1 pessoa\n• `rx!vipcl [quantidade]`'
  },
  freestyle: {
    title: 'Freestyle',
    description: 'Você pode usar todos os benefícios do Ballena e mais poder de setar.',
    benefits: '• /img em 1 pessoa\n• /imperial em até 4 pessoas\n• /antban em até 2 pessoas\n• `rx!vipcl [quantidade]`\n• Benefícios especiais: mutar em call, ensurdecer, chat geral trancado, banir e desconectar'
  }
};

module.exports = {
  name: 'ajuda',
  description: 'Mostra o painel de ajuda dos comandos VIP',
  async execute(message, args) {
    try {
      const vip = await VipModel.getVip(message.author.id);
      const isStaff = message.member.roles.cache.has(config.cargoStaffAutorizado);
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📘 Painel de Ajuda - Rivex VIP')
        .setTimestamp();

      if (!vip) {
        embed
          .setDescription('Você ainda não possui um VIP ativo. Veja abaixo os comandos disponíveis para você.')
          .addFields(
            { name: 'Comandos disponíveis', value: `• ${config.prefix}ajuda — Mostra este painel.\n• ${config.prefix}addvip — Apenas staff autorizado.\n• ${config.prefix}removervip — Apenas staff autorizado.`, inline: false },
            { name: 'Status VIP', value: 'Você não possui VIP ativo no momento.', inline: false }
          );
      } else {
        const userVip = VIP_HELP[vip.vipType] || VIP_HELP.clickbait;
        const commands = [];

        if (vip.vipType !== 'clickbait') {
          commands.push(`• ${config.prefix}vipset [id] @cargo — Setar benefício extra\n• ${config.prefix}vipremove [id] @cargo — Remover benefício que você setou\n• ${config.prefix}vipcl [quantidade] — Deletar suas próprias mensagens`);
        } else {
          commands.push('• Nenhum comando VIP disponível.');
        }

        if (isStaff) {
          commands.unshift(`• ${config.prefix}addvip [id] @cargo — Adiciona VIP (Staff)
• ${config.prefix}removervip [id] — Remove VIP (Staff)`);
        } else {
          commands.unshift('• Apenas staff autorizado pode usar addvip e removervip.');
        }

        embed
          .setDescription(`Seu VIP atual é **${userVip.title}**.`)
          .addFields(
            { name: 'Comandos disponíveis', value: commands.join('\n'), inline: false },
            { name: 'O que você pode usar', value: userVip.description, inline: false },
            { name: 'Benefícios permitidos', value: userVip.benefits, inline: false }
          );
      }

      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('❌ Erro no comando ajuda:', err);
      await message.channel.send({
        embeds: [{
          color: 0xe74c3c,
          title: '❌ Erro ao exibir ajuda',
          description: 'Ocorreu um erro ao abrir o painel de ajuda. Tente novamente mais tarde.',
          timestamp: new Date()
        }]
      });
    }
  }
};
