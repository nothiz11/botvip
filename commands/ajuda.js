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
    description: 'Você não possui benefícios VIP ativos no momento.',
    benefits: 'Nenhum benefício extra disponível.'
  },
  chicago: {
    title: 'Chicago',
    description: 'Você pode usar benefícios VIP básicos.',
    benefits: '• /img em 1 pessoa\n• `rx!vipcl [quantidade]`'
  },
  champagne: {
    title: 'Champagne',
    description: 'Você pode usar benefícios VIP intermediários.',
    benefits: '• /img em 1 pessoa\n• /imperial em 1 pessoa\n• `rx!vipcl [quantidade]`'
  },
  ballena: {
    title: 'Ballena',
    description: 'Você pode usar benefícios VIP avançados e acesso à call privada.',
    benefits: '• /img em 1 pessoa\n• /imperial em até 2 pessoas\n• /antban em 1 pessoa\n• `rx!vipcl [quantidade]`'
  },
  freestyle: {
    title: 'Freestyle',
    description: 'Você pode usar todos os benefícios do Ballena e da call privada.',
    benefits: '• /img em 1 pessoa\n• /imperial em até 4 pessoas\n• /antban em até 2 pessoas\n• `rx!vipcl [quantidade]`'
  }
};

module.exports = {
  name: 'ajuda',
  description: 'Mostra o painel de ajuda dos comandos VIP',
  async execute(message) {
    try {
      const vip = await VipModel.getVip(message.author.id);
      const isAdmin = message.member.roles.cache.has(config.setVipRoleId || config.cargoStaffAutorizado);

      const generalEmbed = new EmbedBuilder()
        .setColor('#3B82F6')
        .setTitle('📘 Painel de Ajuda - Rivex VIP')
        .setDescription('Use os comandos abaixo conforme sua necessidade.')
        .addFields(
          { name: '👤 Comandos Gerais', value: `• ${config.prefix}ajuda — Abrir esta ajuda\n• ${config.prefix}meuvip — Ver seu perfil VIP`, inline: false },
          { name: '👑 Benefícios VIP', value: vip ? `• ${config.prefix}vipset [id] @cargo — Setar benefício\n• ${config.prefix}vipremove [id] @cargo — Remover benefício\n• ${config.prefix}vipcl [quantidade] — Deletar suas mensagens` : '• Nenhum comando VIP disponível para você no momento.', inline: false },
          { name: '🎙️ Call Privada', value: vip && ['ballena', 'freestyle'].includes(vip.vipType) ? '• Use o painel “rx!meuvip” para abrir a call privada e gerenciar as opções.' : '• Disponível apenas para VIPs Ballena e Freestyle.', inline: false }
        );

      if (vip) {
        const userVip = VIP_HELP[vip.vipType] || VIP_HELP.clickbait;
        generalEmbed.addFields(
          { name: '💎 Seu Plano', value: `**${userVip.title}**\n${userVip.description}`, inline: false },
          { name: '✨ Benefícios Atuais', value: userVip.benefits, inline: false }
        );
      }

      const embeds = [generalEmbed];

      if (isAdmin) {
        generalEmbed.addFields(
          { name: '🛠️ Comandos de Administração', value: `• ${config.prefix}addvip [id] @cargo — Adicionar VIP\n• ${config.prefix}removervip [id] — Remover VIP\n• ${config.prefix}renovar [id] — Renovar VIP\n• ${config.prefix}vipinfo [id] — Consultar VIP`, inline: false }
        );
      }

      await message.channel.send({ embeds });
    } catch (err) {
      console.error('❌ Erro no comando ajuda:', err);
      await message.channel.send({
        embeds: [{
          color: 0xe74c3c,
          title: '❌ Erro ao exibir ajuda',
          description: 'Ocorreu um erro ao abrir o painel de ajuda.',
          timestamp: new Date()
        }]
      });
    }
  }
};
