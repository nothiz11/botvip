/**
 * EVENT: ready
 * Executado quando o bot está pronto
 */

const VipModel = require('../models/VipModel');
const config = require('../config.json');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`✅ Bot conectado como: ${client.user.tag}`);
      console.log(`✅ Prefixo: ${config.prefix}`);
      console.log(`✅ Guild: ${config.guildId}`);
      console.log(`${'='.repeat(50)}\n`);

      startExpirationCheck(client);
    } catch (err) {
      console.error('❌ Erro no evento ready:', err);
    }
  }
};

function startExpirationCheck(client) {
  checkExpiredVips(client);
  checkReminders(client);

  setInterval(() => {
    checkExpiredVips(client);
  }, 600000);

  setInterval(() => {
    checkReminders(client);
  }, 86400000);

  console.log('✅ Verificação automática de VIPs iniciada (expiração a cada 10 min e lembretes diários)');
}

async function checkExpiredVips(client) {
  try {
    const expiredVips = await VipModel.getExpiredVips();
    if (expiredVips.length === 0) return;

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    const logChannel = guild.channels.cache.get(config.canalLogsVip);

    for (const vip of expiredVips) {
      try {
        let member;
        try {
          member = await guild.members.fetch(vip.userId);
        } catch (err) {
          console.warn(`⚠️ Membro ${vip.userId} não encontrado`);
        }

        if (member) {
          try {
            const vipRoleId = config.cargosVip[vip.vipType];
            if (vipRoleId && member.roles.cache.has(vipRoleId)) {
              await member.roles.remove(vipRoleId);
            }
          } catch (err) {
            console.error(`❌ Erro ao remover cargo VIP de ${vip.userId}:`, err);
          }

          const benefits = await VipModel.getUserBenefits(vip.userId);
          for (const benefit of benefits) {
            try {
              const benefitRoleId = config.cargosBeneficios[benefit.benefitType];
              if (benefitRoleId && member.roles.cache.has(benefitRoleId)) {
                await member.roles.remove(benefitRoleId);
              }
            } catch (err) {
              console.error(`❌ Erro ao remover benefício de ${vip.userId}:`, err);
            }
          }
        }

        const call = await VipModel.getCallByOwner(vip.userId);
        if (call?.roleId) {
          try {
            const role = await guild.roles.fetch(call.roleId).catch(() => null);
            if (role) await role.delete('Call removida por expiração do VIP').catch(() => null);
          } catch (err) {
            console.error(`❌ Erro ao remover cargo da call ${vip.userId}:`, err);
          }
        }

        if (call?.channelId) {
          try {
            const channel = await guild.channels.fetch(call.channelId).catch(() => null);
            if (channel && channel.deletable) await channel.delete('Call removida por expiração do VIP').catch(() => null);
          } catch (err) {
            console.error(`❌ Erro ao remover canal da call ${vip.userId}:`, err);
          }
        }

        if (call) await VipModel.deleteCall(call.id);
        await VipModel.removeVip(vip.userId);
        await VipModel.addLog('vip_expired', {
          targetUserId: vip.userId,
          vipType: vip.vipType,
          action: 'VIP expirado automaticamente',
          details: { benefitsRemoved: (await VipModel.getUserBenefits(vip.userId)).length }
        });

        try {
          await member?.send?.('Seu VIP expirou e sua call privada foi removida automaticamente.').catch(() => null);
        } catch (err) {
          // ignorar erro de DM fechada
        }

        if (logChannel) {
          try {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor('#95A5A6')
                  .setTitle('📝 Log: VIP Expirado')
                  .addFields(
                    { name: 'Usuário', value: `<@${vip.userId}>`, inline: true },
                    { name: 'VIP Expirado', value: vip.vipType.charAt(0).toUpperCase() + vip.vipType.slice(1), inline: true },
                    { name: 'Data de Expiração', value: new Date(vip.expirationDate).toLocaleDateString('pt-BR'), inline: false }
                  )
                  .setTimestamp()
              ]
            });
          } catch (err) {
            console.error('❌ Erro ao enviar log de expiração:', err);
          }
        }
      } catch (err) {
        console.error(`❌ Erro ao processar VIP expirado ${vip.userId}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Erro na verificação automática de VIPs:', err);
  }
}

async function checkReminders(client) {
  try {
    const vips = await VipModel.getAllActiveVips();
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    for (const vip of vips) {
      try {
        const now = new Date();
        const expiration = new Date(vip.expirationDate);
        const diffDays = Math.ceil((expiration - now) / 86400000);
        const reminderDays = [10, 5, 3, 1];
        const current = String(vip.lastReminderDays || '');

        if (reminderDays.includes(diffDays) && !current.includes(String(diffDays))) {
          const member = await guild.members.fetch(vip.userId).catch(() => null);
          await member?.send?.(`⚠️ Faltam ${diffDays} dia(s) para o vencimento do seu VIP.`).catch(() => null);
          await VipModel.updateReminderStamp(vip.userId, diffDays);
        }
      } catch (err) {
        console.error(`❌ Erro ao enviar lembrete de ${vip.userId}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Erro ao verificar lembretes:', err);
  }
}
