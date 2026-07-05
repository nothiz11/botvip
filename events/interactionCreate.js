const { Events, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const callPanel = require('../commands/callpanel');
const VipModel = require('../models/VipModel');

async function safeReply(interaction, payload) {
  if (!interaction) return null;

  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch (err) {
    if (err?.code === 10062 || err?.code === 40060 || err?.code === 404) {
      console.warn('⚠️ Interação já expirou ou não está mais disponível.');
      return null;
    }
    throw err;
  }
}

async function safeShowModal(interaction, modal) {
  try {
    await interaction.showModal(modal);
    return true;
  } catch (err) {
    if (err?.code === 10062 || err?.code === 40060 || err?.code === 404) {
      console.warn('⚠️ Modal não pôde ser exibido porque a interação expirou.');
      return false;
    }
    throw err;
  }
}

async function handleCallUpdate(interaction, callId, updates, options = {}) {
  const call = await VipModel.getCallById(callId);
  if (!call) {
    await safeReply(interaction, { content: 'A call informada não foi encontrada.', flags: MessageFlags.Ephemeral });
    return;
  }

  const normalizedUpdates = { ...updates };
  if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'nameChanges')) {
    normalizedUpdates.nameChanges = (call.nameChanges || 0) + Number(normalizedUpdates.nameChanges || 1);
  }
  if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'emojiChanges')) {
    normalizedUpdates.emojiChanges = (call.emojiChanges || 0) + Number(normalizedUpdates.emojiChanges || 1);
  }

  await VipModel.updateCall(call.id, normalizedUpdates);
  const updatedCall = await VipModel.getCallById(call.id);

  if (options.syncChannelName !== false) {
    await callPanel.syncCallChannelName(interaction.guild, updatedCall);
  }

await safeReply(interaction, { content: options.message || 'Atualização aplicada com sucesso.', flags: MessageFlags.Ephemeral });
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'create_my_call' || interaction.customId.startsWith('call_create_call_')) {
          const panelCommand = require('../commands/callpanel');
          return panelCommand.createCallForUser(interaction);
        }

        if (interaction.customId.startsWith('call_')) {
          const callId = callPanel.extractCallId(interaction.customId);
          const call = callId ? await VipModel.getCallById(callId) : null;
          if (!call || call.ownerId !== interaction.user.id) {
            return safeReply(interaction, { content: 'Você não pode gerenciar esta call.', flags: MessageFlags.Ephemeral });
          }

          if (interaction.customId.startsWith('call_manage_')) {
            const panelCommand = require('../commands/callpanel');
            return panelCommand.execute(interaction);
          }

          if (interaction.customId.startsWith('call_name_')) {
            const modal = new ModalBuilder().setCustomId(`call_name_modal_${call.id}`).setTitle('Alterar Nome da Call');
            const input = new TextInputBuilder().setCustomId('callName').setLabel('Novo nome').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return safeShowModal(interaction, modal);
          }

          if (interaction.customId.startsWith('call_emoji_')) {
            const modal = new ModalBuilder().setCustomId(`call_emoji_modal_${call.id}`).setTitle('Alterar Emoji da Call');
            const input = new TextInputBuilder().setCustomId('callEmoji').setLabel('Novo emoji').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return safeShowModal(interaction, modal);
          }

          if (interaction.customId.startsWith('call_limit_')) {
            const modal = new ModalBuilder().setCustomId(`call_limit_modal_${call.id}`).setTitle('Alterar Limite da Call');
            const input = new TextInputBuilder().setCustomId('callLimit').setLabel('Novo limite').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return safeShowModal(interaction, modal);
          }

          if (interaction.customId.startsWith('call_role_')) {
            return callPanel.createRoleModal(interaction, call.id);
          }

          if (interaction.customId.startsWith('call_add_guest_')) {
            const modal = new ModalBuilder().setCustomId(`call_add_guest_modal_${call.id}`).setTitle('Adicionar Amigo');
            const input = new TextInputBuilder().setCustomId('guestId').setLabel('ID do usuário').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return safeShowModal(interaction, modal);
          }

          if (interaction.customId.startsWith('call_remove_guest_')) {
            const modal = new ModalBuilder().setCustomId(`call_remove_guest_modal_${call.id}`).setTitle('Remover Amigo');
            const input = new TextInputBuilder().setCustomId('guestId').setLabel('ID do usuário').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return safeShowModal(interaction, modal);
          }

          if (interaction.customId.startsWith('call_privacy_')) {
            return callPanel.handlePrivacySelection(interaction, call);
          }

          if (interaction.customId.startsWith('call_stats_')) {
            const statsEmbed = new EmbedBuilder()
              .setColor('#5865f2')
              .setTitle('📊 Estatísticas da Call')
              .addFields(
                { name: 'Data de criação', value: new Date(call.createdAt).toLocaleDateString('pt-BR'), inline: true },
                { name: 'Última alteração', value: new Date(call.updatedAt).toLocaleDateString('pt-BR'), inline: true },
                { name: 'Quantidade atual de convidados', value: String(call.guestCount || 0), inline: true },
                { name: 'Total de convidados adicionados', value: String(call.totalGuestsAdded || 0), inline: true },
                { name: 'Total de convidados removidos', value: String(call.totalGuestsRemoved || 0), inline: true },
                { name: 'Alterações de nome', value: String(call.nameChanges || 0), inline: true },
                { name: 'Alterações de emoji', value: String(call.emojiChanges || 0), inline: true },
                { name: 'Recriações de cargo', value: String(call.roleRecreations || 0), inline: true }
              );
            return safeReply(interaction, { embeds: [statsEmbed], flags: MessageFlags.Ephemeral });
          }

          if (interaction.customId.startsWith('call_backup_')) {
            await VipModel.saveCallBackup(call.ownerId, call.guildId, call);
            return safeReply(interaction, { content: 'Backup salvo com sucesso.', flags: MessageFlags.Ephemeral });
          }

          if (interaction.customId.startsWith('call_delete_')) {
            await callPanel.deleteCallAndChannel(interaction.guild, call);
            return safeReply(interaction, { content: 'Call removida e dados preservados no backup.', flags: MessageFlags.Ephemeral });
          }

          if (interaction.customId.startsWith('call_restore_backup_')) {
            const backup = await VipModel.getLatestBackup(call.ownerId);
            if (backup) {
              await VipModel.updateCall(call.id, {
                name: backup.name || call.name,
                emoji: backup.emoji || call.emoji,
                limitNumber: backup.limitNumber || call.limitNumber,
                privacy: backup.privacy || call.privacy,
                roleColor: backup.roleColor || call.roleColor,
                roleHoist: backup.roleHoist || call.roleHoist,
                roleMentionable: backup.roleMentionable || call.roleMentionable
              });
            }
            return safeReply(interaction, { content: 'Backup restaurado.', flags: MessageFlags.Ephemeral });
          }
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('call_name_modal_')) {
          const callId = callPanel.extractCallId(interaction.customId);
          const newName = interaction.fields.getTextInputValue('callName').trim();
          if (!callId || !newName) {
            await safeReply(interaction, { content: 'Nome inválido. Tente novamente.', flags: MessageFlags.Ephemeral });
            return;
          }
          await handleCallUpdate(interaction, callId, { name: newName, nameChanges: 1 }, { message: 'Nome da call atualizado.' });
          return;
        }

        if (interaction.customId.startsWith('call_emoji_modal_')) {
          const callId = callPanel.extractCallId(interaction.customId);
          const newEmoji = interaction.fields.getTextInputValue('callEmoji').trim();
          if (!callId || !newEmoji) {
            await safeReply(interaction, { content: 'Emoji inválido. Tente novamente.', flags: MessageFlags.Ephemeral });
            return;
          }
          await handleCallUpdate(interaction, callId, { emoji: newEmoji, emojiChanges: 1 }, { message: 'Emoji da call atualizado.' });
          return;
        }

        if (interaction.customId.startsWith('call_limit_modal_')) {
          const callId = callPanel.extractCallId(interaction.customId);
          const limit = parseInt(interaction.fields.getTextInputValue('callLimit'), 10);
          if (!callId || Number.isNaN(limit) || limit < 1) {
            await safeReply(interaction, { content: 'Limite inválido. Informe um número maior que zero.', flags: MessageFlags.Ephemeral });
            return;
          }
          await handleCallUpdate(interaction, callId, { limitNumber: limit }, { message: 'Limite da call atualizado.' });
          return;
        }

        if (interaction.customId.startsWith('call_role_modal_')) {
          const callId = callPanel.extractCallId(interaction.customId);
          const call = await VipModel.getCallById(callId);
          const guild = interaction.guild;
          const roleName = interaction.fields.getTextInputValue('roleName').trim();
          const roleColor = interaction.fields.getTextInputValue('roleColor') || '5865f2';
          const hoist = /sim/i.test(interaction.fields.getTextInputValue('roleHoist') || 'Não');
          const mentionable = /sim/i.test(interaction.fields.getTextInputValue('roleMentionable') || 'Não');

          if (!roleName) {
            await safeReply(interaction, { content: 'Informe um nome para o cargo.', flags: MessageFlags.Ephemeral });
            return;
          }

          const role = await guild.roles.create({ name: roleName, color: roleColor, hoist, mentionable, reason: 'Cargo criado pela call privada' });
          await VipModel.updateCall(call.id, { roleId: role.id, roleColor, roleHoist: hoist ? 1 : 0, roleMentionable: mentionable ? 1 : 0, roleRecreations: (call.roleRecreations || 0) + 1 });

          if (call.channelId) {
            const channel = await guild.channels.fetch(call.channelId).catch(() => null);
            if (channel?.isVoiceBased?.()) {
              await callPanel.applyPrivacyToChannel?.(guild, channel, call.privacy || 'public', role.id);
              await callPanel.setRolePermissionsForChannel?.(guild, channel, role);
            }
          }

          try {
            const ownerMember = await guild.members.fetch(call.ownerId).catch(() => null);
            if (ownerMember && !ownerMember.roles.cache.has(role.id)) {
              await ownerMember.roles.add(role).catch(() => null);
            }
          } catch (err) {
            console.error('❌ Não foi possível atribuir o cargo oficial ao dono da call:', err);
          }

          await safeReply(interaction, { content: `Cargo criado com sucesso: ${role.name}`, flags: MessageFlags.Ephemeral });
          return;
        }

        if (interaction.customId.startsWith('call_add_guest_modal_')) {
          const callId = callPanel.extractCallId(interaction.customId);
          const call = await VipModel.getCallById(callId);
          const guestId = interaction.fields.getTextInputValue('guestId').replace(/\D/g, '');
          const result = await VipModel.addGuest(call.id, guestId, interaction.user.id);
          if (result.success) {
            await VipModel.updateCall(call.id, { guestCount: (call.guestCount || 0) + 1, totalGuestsAdded: (call.totalGuestsAdded || 0) + 1 });
            await safeReply(interaction, { content: 'Convidado adicionado.', flags: MessageFlags.Ephemeral });
          }
          return;
        }

        if (interaction.customId.startsWith('call_remove_guest_modal_')) {
          const callId = callPanel.extractCallId(interaction.customId);
          const call = await VipModel.getCallById(callId);
          const guestId = interaction.fields.getTextInputValue('guestId').replace(/\D/g, '');
          const result = await VipModel.removeGuest(call.id, guestId);
          if (result.success) {
            await VipModel.updateCall(call.id, { guestCount: Math.max(0, (call.guestCount || 0) - 1), totalGuestsRemoved: (call.totalGuestsRemoved || 0) + 1 });
            await safeReply(interaction, { content: 'Convidado removido.', flags: MessageFlags.Ephemeral });
          }
          return;
        }
      }

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('call_privacy_select_')) {
          const callId = callPanel.extractCallId(interaction.customId);
          const privacy = interaction.values[0];
          const call = await VipModel.getCallById(callId);
          await VipModel.updateCall(callId, { privacy });
          if (call?.channelId) {
            const channel = await interaction.guild.channels.fetch(call.channelId).catch(() => null);
            if (channel?.isVoiceBased?.()) {
              await callPanel.applyPrivacyToChannel?.(interaction.guild, channel, privacy, call.roleId || null);
            }
          }
          await safeReply(interaction, { content: `Privacidade atualizada para ${privacy}.`, flags: MessageFlags.Ephemeral });
        }
      }
    } catch (err) {
      console.error('❌ Erro no interactionCreate:', err);
      if (!interaction.replied && !interaction.deferred) {
        try {
          await safeReply(interaction, { content: 'Ocorreu um erro na interação.', flags: MessageFlags.Ephemeral });
        } catch (replyErr) {
          console.warn('⚠️ Não foi possível responder ao erro da interação:', replyErr);
        }
      }
    }
  }
};
