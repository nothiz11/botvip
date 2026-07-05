const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');
const VipModel = require('../models/VipModel');

const ALLOWED_VIPS = ['ballena', 'freestyle'];

function isAllowedVip(vipType) {
  return ALLOWED_VIPS.includes(vipType);
}

function formatPrivacy(value) {
  if (value === 'private') return '🔐 Somente Eu';
  if (value === 'guests') return '👥 Apenas Convidados';
  return '🌍 Público';
}

function createPanelEmbed(call) {
  return new EmbedBuilder()
    .setColor('#5865f2')
    .setTitle(`<:sinfo:1482885110813691926> Painel da Call - ${call.name || 'Minha Call'}`)
    .setDescription('Gerencie sua call privada com os botões abaixo.')
    .addFields(
      { name: '<:rocket:1495830214775803957> Dono', value: `<@${call.ownerId}>`, inline: true },
      { name: '<:emoji_91:1495569481001472113> Emoji', value: call.emoji || '🎧', inline: true },
      { name: '<:global_StorM:1495569937614241913> Limite', value: String(call.limitNumber || 5), inline: true },
      { name: '<:RivexBlox:1470583662113198303> Privacidade', value: formatPrivacy(call.privacy), inline: true },
      { name: '<:7619planet:1495818283042210034> Cargo', value: call.roleId ? `<@&${call.roleId}>` : 'Sem cargo', inline: true },
      { name: '<:membro:1495571715617460264> Convidados', value: String(call.guestCount || 0), inline: true }
    );
}

function createManageButtons(call) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`call_name_${call.id}`).setLabel('Alterar Nome').setEmoji('✏️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`call_emoji_${call.id}`).setLabel('Alterar Emoji').setEmoji('😀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`call_limit_${call.id}`).setLabel('Alterar Limite').setEmoji('👥').setStyle(ButtonStyle.Primary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`call_role_${call.id}`).setLabel('Criar Cargo').setEmoji('🎭').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`call_create_call_${call.id}`).setLabel('Criar Call').setEmoji('🎙️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`call_privacy_${call.id}`).setLabel('Privacidade').setEmoji('🔒').setStyle(ButtonStyle.Secondary)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`call_stats_${call.id}`).setLabel('Estatísticas').setEmoji('📊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`call_delete_${call.id}`).setLabel('Excluir Call').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
  );
  return [row1, row2, row3];
}

async function sendContextReply(source, options) {
  if (!source) return null;

  const payload = {
    ...options,
    flags: options.flags ?? (options.ephemeral ? MessageFlags.Ephemeral : (source.reply ? MessageFlags.Ephemeral : undefined))
  };
  delete payload.ephemeral;

  if (source.reply) {
    if (source.deferred || source.replied) {
      try {
        return await source.followUp(payload);
      } catch (err) {
        try {
          return await source.editReply(payload);
        } catch (editErr) {
          console.error('❌ Não foi possível enviar resposta de follow-up:', editErr);
          return null;
        }
      }
    }

    return source.reply(payload);
  }

  return source.channel.send(payload);
}

function formatCallChannelName(call) {
  const name = (call?.name || 'Minha Call').trim();
  const emoji = (call?.emoji || '🎧').trim() || '🎧';
  return `︰${emoji}・${name}`;
}

function extractCallId(customId) {
  const match = String(customId || '').match(/(\d+)$/);
  return match ? Number(match[1]) : null;
}

async function createCallChannel(guild, call) {
  const categoryId = config.vipCallCategoryId || config.vipCallCategory || config.callCategoryId || config.categoryId;
  if (!categoryId) {
    throw new Error('Categoria de calls não configurada em config.json.');
  }

  const category = await guild.channels.fetch(categoryId).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    throw new Error('A categoria configurada para as calls é inválida ou não foi encontrada.');
  }

  return guild.channels.create({
    name: formatCallChannelName(call),
    type: ChannelType.GuildVoice,
    parent: category.id,
    userLimit: Math.max(0, Number(call.limitNumber) || 0),
    reason: 'Call privada criada pelo sistema VIP'
  });
}

async function applyPrivacyToChannel(guild, channel, privacy, roleId) {
  try {
    const everyoneRole = guild.roles.everyone;
    const role = roleId ? await guild.roles.fetch(roleId).catch(() => null) : null;

    const base = [
      {
        id: everyoneRole.id,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream]
      }
    ];

    if (role) {
      base.push({
        id: role.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream],
        deny: []
      });
    }

    await channel.permissionOverwrites.set(base);
  } catch (err) {
    console.error('❌ Erro ao aplicar privacidade da call:', err);
  }
}

async function syncCallChannelName(guild, call) {
  if (!guild || !call) return;

  let channel = null;
  if (call.channelId) {
    channel = await guild.channels.fetch(call.channelId).catch(() => null);
  }

  if (!channel) {
    const configuredCategoryId = config.vipCallCategoryId || config.vipCallCategory || config.callCategoryId || config.categoryId;
    const categoryId = configuredCategoryId || null;

    channel = guild.channels.cache.find((candidate) => {
      if (!candidate?.isVoiceBased?.()) return false;
      if (categoryId && candidate.parentId && candidate.parentId !== categoryId) return false;
      return candidate.name.includes(call.name || '') || candidate.name.includes(call.emoji || '');
    }) || null;
  }

  if (!channel || !channel.isVoiceBased?.()) return;

  const userLimit = Math.max(0, Number(call.limitNumber) || 0);

  await channel.setName(formatCallChannelName(call)).catch((err) => {
    console.error('❌ Não foi possível atualizar o nome do canal da call:', err);
  });

  await channel.setUserLimit(userLimit).catch((err) => {
    console.error('❌ Não foi possível atualizar o limite de usuários da call:', err);
  });
}

async function deleteCallAndChannel(guild, call) {
  if (!guild || !call) return;

  try {
    if (call.channelId) {
      const channel = await guild.channels.fetch(call.channelId).catch(() => null);
      if (channel?.deletable) {
        await channel.delete(`Call removida pelo sistema VIP (${call.ownerId})`).catch(() => null);
      }
    }
  } catch (err) {
    console.error('❌ Erro ao excluir canal da call:', err);
  }

  await VipModel.deleteCall(call.id);
}

async function setRolePermissionsForChannel(guild, channel, role) {
  if (!guild || !channel || !role) return;

  try {
    await channel.permissionOverwrites.edit(role, {
      ViewChannel: true,
      Connect: true,
      Speak: true,
      Stream: true,
      UseVAD: true,
      SendMessages: true,
      AddReactions: true
    });
  } catch (err) {
    console.error('❌ Erro ao aplicar permissões do cargo na call:', err);
  }
}

async function ensureCallExists(source) {
  const userId = source.user?.id || source.author?.id;
  const guild = source.guild;
  if (!guild || !userId) return null;

  const vip = await VipModel.getVip(userId);
  if (!vip || !isAllowedVip(vip.vipType)) {
    await sendContextReply(source, { content: 'Você precisa ter VIP Ballena ou Freestyle para usar esta função.' });
    return null;
  }

  let call = await VipModel.getCallByOwner(userId);
  if (!call) {
    const created = await VipModel.createCall({ ownerId: userId, guildId: guild.id, name: 'Minha Call', emoji: '🎧', limitNumber: 5, privacy: 'public' });
    if (!created.success) {
      await sendContextReply(source, { content: 'Não foi possível criar a call no banco.' });
      return null;
    }
    call = await VipModel.getCallByOwner(userId);
    if (!call) {
      await sendContextReply(source, { content: 'Não foi possível recuperar a call criada.' });
      return null;
    }
  }
  return call;
}

async function createCallForUser(source) {
  const userId = source.user?.id || source.author?.id;
  const guild = source.guild;
  if (!guild || !userId) {
    await sendContextReply(source, { content: 'Não foi possível identificar o usuário ou o servidor.' });
    return null;
  }

  if (source.reply && !source.deferred && !source.replied) {
    await source.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const vip = await VipModel.getVip(userId);
  if (!vip || !isAllowedVip(vip.vipType)) {
    await sendContextReply(source, { content: 'Você precisa ter VIP Ballena ou Freestyle para criar uma call.' });
    return null;
  }

  const existingCall = await VipModel.getCallByOwner(userId);
  if (existingCall) {
    await sendContextReply(source, { content: 'Você já possui uma call registrada. Não é possível criar outra.' });
    return existingCall;
  }

  const created = await VipModel.createCall({ ownerId: userId, guildId: guild.id, name: 'Minha Call', emoji: '🎧', limitNumber: 5, privacy: 'public' });
  if (!created.success) {
    await sendContextReply(source, { content: 'Não foi possível salvar a call no banco de dados.' });
    return null;
  }

  const call = await VipModel.getCallByOwner(userId);
  if (!call) {
    await sendContextReply(source, { content: 'A call foi criada no banco, mas não foi possível carregá-la para continuar.' });
    return null;
  }

  try {
    const channel = await createCallChannel(guild, call);
    await applyPrivacyToChannel(guild, channel, call.privacy || 'public', call.roleId || null);
    if (call.roleId) {
      const role = await guild.roles.fetch(call.roleId).catch(() => null);
      await setRolePermissionsForChannel(guild, channel, role);
    }
    await VipModel.updateCall(call.id, { channelId: channel.id });
    await sendContextReply(source, { content: `Call criada com sucesso! Canal: ${channel}, Use rx!meuvip para gerenciar a call!` });
    return { ...call, channelId: channel.id };
  } catch (err) {
    console.error('❌ Erro ao criar canal da call:', err);
    await VipModel.deleteCall(call.id);
    await sendContextReply(source, { content: err.message || 'Não foi possível criar a call. Verifique a categoria configurada e tente novamente.' });
    return null;
  }
}

async function createRoleModal(interaction, callId) {
  const modal = new ModalBuilder().setCustomId(`call_role_modal_${callId}`).setTitle('Criar Cargo da Call');
  const nameInput = new TextInputBuilder().setCustomId('roleName').setLabel('Nome do Cargo').setStyle(TextInputStyle.Short).setRequired(true);
  const emojiInput = new TextInputBuilder().setCustomId('roleEmoji').setLabel('Emoji').setStyle(TextInputStyle.Short).setRequired(false);
  const colorInput = new TextInputBuilder().setCustomId('roleColor').setLabel('Cor').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('5865f2');
  const hoistInput = new TextInputBuilder().setCustomId('roleHoist').setLabel('Mostrar separado na lista (Sim/Não)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Sim');
  const mentionableInput = new TextInputBuilder().setCustomId('roleMentionable').setLabel('Cargo mencionável (Sim/Não)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Não');

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(emojiInput),
    new ActionRowBuilder().addComponents(colorInput),
    new ActionRowBuilder().addComponents(hoistInput),
    new ActionRowBuilder().addComponents(mentionableInput)
  );
  try {
    await interaction.showModal(modal);
  } catch (err) {
    if (err?.code === 10062 || err?.code === 40060 || err?.code === 404) {
      await sendContextReply(interaction, { content: 'A interação expirou. Reabra o painel e tente novamente.', flags: MessageFlags.Ephemeral });
      return;
    }
    throw err;
  }
}

async function handlePrivacySelection(interaction, call) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`call_privacy_select_${call.id}`)
    .setPlaceholder('Escolha a privacidade da call')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Público').setValue('public').setEmoji('🌍'),
      new StringSelectMenuOptionBuilder().setLabel('Apenas Convidados').setValue('guests').setEmoji('👥'),
      new StringSelectMenuOptionBuilder().setLabel('Somente Eu').setValue('private').setEmoji('🔐')
    );

  await interaction.reply({ content: 'Escolha a privacidade da sua call:', components: [new ActionRowBuilder().addComponents(select)], flags: MessageFlags.Ephemeral });
}

async function sendCallPanel(interaction, call) {
  const panel = createPanelEmbed(call);
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [panel], components: createManageButtons(call) });
  } else {
    await interaction.reply({ embeds: [panel], components: createManageButtons(call), flags: MessageFlags.Ephemeral });
  }
}

module.exports = {
  name: 'callpanel',
  description: 'Painel de gerenciamento da call privada',
  async execute(source) {
    const call = await ensureCallExists(source);
    if (!call) return;
    await sendCallPanel(source, call);
  },
  createPanelEmbed,
  createManageButtons,
  ensureCallExists,
  createCallForUser,
  createRoleModal,
  handlePrivacySelection,
  sendCallPanel,
  syncCallChannelName,
  deleteCallAndChannel,
  setRolePermissionsForChannel,
  applyPrivacyToChannel,
  extractCallId,
  isAllowedVip
};
