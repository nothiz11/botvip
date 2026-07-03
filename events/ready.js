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
      
      // Iniciar verificação automática de VIPs expirados
      startExpirationCheck(client);
      
    } catch (err) {
      console.error('❌ Erro no evento ready:', err);
    }
  }
};

/**
 * Iniciar verificação automática de VIPs expirados (a cada 10 minutos)
 * @param {object} client - Cliente do Discord
 */
function startExpirationCheck(client) {
  // Executar verificação imediatamente
  checkExpiredVips(client);
  
  // Executar a cada 10 minutos (600000 ms)
  setInterval(() => {
    checkExpiredVips(client);
  }, 600000);
  
  console.log('✅ Verificação automática de VIPs expirados iniciada (a cada 10 minutos)');
}

/**
 * Verificar e remover VIPs expirados
 * @param {object} client - Cliente do Discord
 */
async function checkExpiredVips(client) {
  try {
    // Obter VIPs expirados
    const expiredVips = await VipModel.getExpiredVips();
    
    if (expiredVips.length === 0) {
      console.log('✅ Nenhum VIP expirado encontrado');
      return;
    }
    
    console.log(`⏰ Encontrado ${expiredVips.length} VIP(s) expirado(s)...`);
    
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
      console.error('❌ Guild não encontrada');
      return;
    }
    
    const logChannel = guild.channels.cache.get(config.canalLogsVip);
    
    // Processar cada VIP expirado
    for (const vip of expiredVips) {
      try {
        // Buscar member
        let member;
        try {
          member = await guild.members.fetch(vip.userId);
        } catch (err) {
          console.warn(`⚠️ Membro ${vip.userId} não encontrado ou já saiu do servidor`);
          // Mesmo assim, registrar a remoção no banco
          await VipModel.removeVip(vip.userId);
          continue;
        }
        
        // Remover cargo VIP
        try {
          const vipRoleId = config.cargosVip[vip.vipType];
          if (vipRoleId && member.roles.cache.has(vipRoleId)) {
            await member.roles.remove(vipRoleId);
          }
        } catch (err) {
          console.error(`❌ Erro ao remover cargo VIP de ${vip.userId}:`, err);
        }
        
        // Obter e remover benefícios
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
        
        // Remover do banco de dados
        await VipModel.removeVip(vip.userId);
        
        // Registrar log
        await VipModel.addLog('vip_expired', {
          targetUserId: vip.userId,
          vipType: vip.vipType,
          action: 'VIP expirado automaticamente',
          details: { benefitsRemoved: benefits.length }
        });
        
        console.log(`✅ VIP ${vip.vipType} de ${vip.userId} foi removido (expirado)`);
        
        // Enviar notificação no canal de logs
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
