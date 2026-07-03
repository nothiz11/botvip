/**
 * EMBEDS UTILITY - Funções para criar embeds bonitos e organizados
 */

const { EmbedBuilder } = require('discord.js');

function createBaseEmbed() {
  return new EmbedBuilder()
    .setAuthor({ name: '💎 Rivex VIP', iconURL: undefined })
    .setFooter({ text: 'Rivex VIP Premium' })
    .setTimestamp();
}

/**
 * Criar embed de sucesso
 */
function createSuccessEmbed(title, description, fields = []) {
  const embed = createBaseEmbed()
    .setColor('#2ECC71')
    .setTitle(`✅ ${title}`)
    .setDescription(description);

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}

/**
 * Criar embed de erro
 */
function createErrorEmbed(title, description) {
  return createBaseEmbed()
    .setColor('#E74C3C')
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

/**
 * Criar embed de informação
 */
function createInfoEmbed(title, description, fields = []) {
  const embed = createBaseEmbed()
    .setColor('#3498DB')
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description);

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}

/**
 * Embed para VIP adicionado
 */
function createVipAddedEmbed(userId, vipType, expirationDate) {
  const expDate = new Date(expirationDate).toLocaleDateString('pt-BR');

  return createBaseEmbed()
    .setColor('#D4AF37')
    .setTitle('🌟 VIP Adicionado')
    .setDescription('Seu status VIP foi atualizado com estilo premium.')
    .addFields(
      { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
      { name: '🏷️ VIP', value: vipType.charAt(0).toUpperCase() + vipType.slice(1), inline: true },
      { name: '⏳ Expira em', value: expDate, inline: false }
    );
}

/**
 * Embed para VIP removido
 */
function createVipRemovedEmbed(userId, vipType) {
  return createBaseEmbed()
    .setColor('#E74C3C')
    .setTitle('❌ VIP Removido')
    .setDescription('O VIP foi removido com sucesso.')
    .addFields(
      { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
      { name: '🏷️ VIP', value: vipType.charAt(0).toUpperCase() + vipType.slice(1), inline: true }
    );
}

/**
 * Embed para VIP expirado
 */
function createVipExpiredEmbed(userId, vipType) {
  return createBaseEmbed()
    .setColor('#95A5A6')
    .setTitle('⏰ VIP Expirado')
    .setDescription('O VIP expirou e foi removido automaticamente.')
    .addFields(
      { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
      { name: '🏷️ VIP', value: vipType.charAt(0).toUpperCase() + vipType.slice(1), inline: true }
    );
}

/**
 * Embed para benefício adicionado
 */
function createBenefitAddedEmbed(targetUserId, grantedByUserId, benefitType) {
  return createBaseEmbed()
    .setColor('#9B59B6')
    .setTitle('🎁 Benefício Adicionado')
    .setDescription('Um benefício premium foi ativado para este usuário.')
    .addFields(
      { name: '👤 Usuário', value: `<@${targetUserId}>`, inline: true },
      { name: '🏅 Concedido por', value: `<@${grantedByUserId}>`, inline: true },
      { name: '✨ Tipo', value: benefitType, inline: false }
    );
}

/**
 * Embed para benefício removido
 */
function createBenefitRemovedEmbed(targetUserId, benefitType) {
  return createBaseEmbed()
    .setColor('#E67E22')
    .setTitle('🗑️ Benefício Removido')
    .setDescription('Um benefício foi removido do usuário.')
    .addFields(
      { name: '👤 Usuário', value: `<@${targetUserId}>`, inline: true },
      { name: '✨ Tipo', value: benefitType, inline: true }
    );
}

/**
 * Embed para permissão negada
 */
function createPermissionDeniedEmbed(reason) {
  return createBaseEmbed()
    .setColor('#E74C3C')
    .setTitle('🚫 Permissão Negada')
    .setDescription(reason);
}

/**
 * Embed para informações do VIP do usuário
 */
function createVipInfoEmbed(userId, vipType, expirationDate, benefits = []) {
  const expDate = new Date(expirationDate).toLocaleDateString('pt-BR');
  const daysLeft = Math.ceil((new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24));

  const embed = createBaseEmbed()
    .setColor('#D4AF37')
    .setTitle('🌟 Informações VIP')
    .setDescription('Status VIP premium com detalhes claros e elegantes.')
    .addFields(
      { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
      { name: '🏷️ VIP', value: vipType.charAt(0).toUpperCase() + vipType.slice(1), inline: true },
      { name: '📅 Expiração', value: expDate, inline: false },
      { name: '⏳ Restam', value: `${daysLeft} dias`, inline: true }
    );

  if (benefits.length > 0) {
    const benefitsList = benefits
      .map(b => `• ${b.benefitType}`)
      .join('\n');
    embed.addFields({ name: '✨ Benefícios Ativos', value: benefitsList, inline: false });
  } else {
    embed.addFields({ name: '✨ Benefícios Ativos', value: 'Nenhum benefício ativo', inline: false });
  }

  return embed;
}

/**
 * Criar embed de perfil VIP
 */
function createVipProfileEmbed(userId, vipType, expirationDate, benefits = []) {
  const expDate = new Date(expirationDate).toLocaleDateString('pt-BR');
  const now = new Date();
  const diffMs = new Date(expirationDate) - now;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const timeLeft = diffMs > 0
    ? `${days} dias, ${hours} horas e ${minutes} minutos`
    : 'Expirado';

  const embed = createBaseEmbed()
    .setColor('#D4AF37')
    .setTitle('🌟 Perfil VIP Premium')
    .setDescription('Confira o VIP atual, benefícios ativos e o tempo restante.')
    .addFields(
      { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
      { name: '🏷️ VIP', value: vipType.charAt(0).toUpperCase() + vipType.slice(1), inline: true },
      { name: '📅 Expira em', value: expDate, inline: false },
      { name: '⏳ Tempo restante', value: timeLeft, inline: false }
    );

  if (benefits.length > 0) {
    const benefitsList = benefits
      .map(b => `• ${b.benefitType} — setado por <@${b.grantedByUserId}>`)
      .join('\n');

    embed.addFields({ name: '✨ Benefícios Ativos', value: benefitsList, inline: false });
  } else {
    embed.addFields({ name: '✨ Benefícios Ativos', value: 'Nenhum benefício ativo', inline: false });
  }

  return embed;
}

module.exports = {
  createSuccessEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createVipAddedEmbed,
  createVipRemovedEmbed,
  createVipExpiredEmbed,
  createBenefitAddedEmbed,
  createBenefitRemovedEmbed,
  createPermissionDeniedEmbed,
  createVipInfoEmbed,
  createVipProfileEmbed
};
