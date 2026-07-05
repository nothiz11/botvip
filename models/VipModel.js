/**
 * VIP MODEL - Modelos para gerenciar VIPs no banco de dados
 */

const { runAsync, getAsync, allAsync } = require('../database');

// ====== OPERAÇÕES COM VIPs ======

async function addVip(userId, vipType, daysValid = 30) {
  try {
    const now = new Date();
    const expiration = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000);

    await runAsync(
      `INSERT INTO vips (userId, vipType, expirationDate, active, renewals, lastRenewalDate, lastReminderDays)
       VALUES (?, ?, ?, 1, 0, NULL, NULL)
       ON CONFLICT(userId) DO UPDATE SET vipType = excluded.vipType, expirationDate = excluded.expirationDate, active = 1, renewals = COALESCE(vips.renewals, 0), lastReminderDays = vips.lastReminderDays`,
      [userId, vipType, expiration.toISOString()]
    );

    return { success: true, expiration };
  } catch (err) {
    console.error('❌ Erro ao adicionar VIP:', err);
    return { success: false, error: err.message };
  }
}

async function renewVip(userId, daysValid = 30) {
  try {
    const vip = await getVip(userId);
    if (!vip) return { success: false, error: 'Usuário não é VIP' };

    const now = new Date();
    const currentExpiration = new Date(vip.expirationDate);
    const baseDate = currentExpiration > now ? currentExpiration : now;
    const expiration = new Date(baseDate.getTime() + daysValid * 24 * 60 * 60 * 1000);

    await runAsync(
      `UPDATE vips SET expirationDate = ?, renewals = COALESCE(renewals, 0) + 1, lastRenewalDate = ?, lastReminderDays = NULL WHERE userId = ? AND active = 1`,
      [expiration.toISOString(), now.toISOString(), userId]
    );

    return { success: true, expiration };
  } catch (err) {
    console.error('❌ Erro ao renovar VIP:', err);
    return { success: false, error: err.message };
  }
}

async function removeVip(userId) {
  try {
    const vip = await getVip(userId);
    if (!vip) return { success: false, error: 'Usuário não é VIP' };

    await runAsync(`UPDATE vips SET active = 0 WHERE userId = ?`, [userId]);
    await runAsync(`UPDATE vip_benefits SET active = 0 WHERE targetUserId = ?`, [userId]);

    return { success: true, vipType: vip.vipType };
  } catch (err) {
    console.error('❌ Erro ao remover VIP:', err);
    return { success: false, error: err.message };
  }
}

async function getVip(userId) {
  try {
    const vip = await getAsync(`SELECT * FROM vips WHERE userId = ? AND active = 1`, [userId]);
    return vip;
  } catch (err) {
    console.error('❌ Erro ao buscar VIP:', err);
    return null;
  }
}

async function getExpiredVips() {
  try {
    const now = new Date().toISOString();
    return await allAsync(`SELECT * FROM vips WHERE active = 1 AND expirationDate < ?`, [now]);
  } catch (err) {
    console.error('❌ Erro ao buscar VIPs expirados:', err);
    return [];
  }
}

async function getAllActiveVips() {
  try {
    return await allAsync(`SELECT * FROM vips WHERE active = 1 ORDER BY expirationDate ASC`);
  } catch (err) {
    console.error('❌ Erro ao buscar VIPs ativos:', err);
    return [];
  }
}

async function getVipsNearExpiration(days = 7) {
  try {
    const now = new Date().toISOString();
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    return await allAsync(`SELECT * FROM vips WHERE active = 1 AND expirationDate BETWEEN ? AND ? ORDER BY expirationDate ASC`, [now, limit]);
  } catch (err) {
    console.error('❌ Erro ao buscar VIPs próximos do vencimento:', err);
    return [];
  }
}

async function updateReminderStamp(userId, daysLeft) {
  try {
    await runAsync(`UPDATE vips SET lastReminderDays = ? WHERE userId = ? AND active = 1`, [String(daysLeft), userId]);
  } catch (err) {
    console.error('❌ Erro ao atualizar aviso do VIP:', err);
  }
}

// ====== OPERAÇÕES COM BENEFÍCIOS ======

async function addBenefit(targetUserId, grantedByUserId, benefitType) {
  try {
    const benefitId = `${grantedByUserId}_${targetUserId}_${benefitType}`;

    await runAsync(
      `INSERT INTO vip_benefits (benefitId, targetUserId, grantedByUserId, benefitType, active)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(benefitId) DO UPDATE SET active = 1, grantedDate = CURRENT_TIMESTAMP`,
      [benefitId, targetUserId, grantedByUserId, benefitType]
    );

    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao adicionar benefício:', err);
    return { success: false, error: err.message };
  }
}

async function removeBenefit(targetUserId, benefitType, grantedByUserId) {
  try {
    const benefit = await getBenefit(targetUserId, benefitType, grantedByUserId);

    if (!benefit) return { success: false, error: 'Benefício não encontrado' };
    if (benefit.grantedByUserId !== grantedByUserId) return { success: false, error: 'Apenas quem setou pode remover' };

    await runAsync(
      `UPDATE vip_benefits SET active = 0 WHERE targetUserId = ? AND benefitType = ? AND grantedByUserId = ?`,
      [targetUserId, benefitType, grantedByUserId]
    );

    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao remover benefício:', err);
    return { success: false, error: err.message };
  }
}

async function getBenefit(targetUserId, benefitType, grantedByUserId = null) {
  try {
    let query = `SELECT * FROM vip_benefits WHERE targetUserId = ? AND benefitType = ? AND active = 1`;
    const params = [targetUserId, benefitType];

    if (grantedByUserId) {
      query += ' AND grantedByUserId = ?';
      params.push(grantedByUserId);
    }

    return await getAsync(query, params);
  } catch (err) {
    console.error('❌ Erro ao buscar benefício:', err);
    return null;
  }
}

async function getUserBenefits(targetUserId) {
  try {
    return await allAsync(`SELECT * FROM vip_benefits WHERE targetUserId = ? AND active = 1`, [targetUserId]);
  } catch (err) {
    console.error('❌ Erro ao buscar benefícios:', err);
    return [];
  }
}

async function countBenefitsByUser(grantedByUserId, benefitType) {
  try {
    const result = await getAsync(`SELECT COUNT(*) as count FROM vip_benefits WHERE grantedByUserId = ? AND benefitType = ? AND active = 1`, [grantedByUserId, benefitType]);
    return result.count;
  } catch (err) {
    console.error('❌ Erro ao contar benefícios:', err);
    return 0;
  }
}

async function getBenefitsGrantedByUser(grantedByUserId) {
  try {
    return await allAsync(`SELECT * FROM vip_benefits WHERE grantedByUserId = ? AND active = 1`, [grantedByUserId]);
  } catch (err) {
    console.error('❌ Erro ao buscar benefícios do usuário:', err);
    return [];
  }
}

// ====== OPERAÇÕES COM CALLS ======

async function createCall(data) {
  try {
    const result = await runAsync(
      `INSERT INTO calls (ownerId, guildId, channelId, roleId, name, emoji, limitNumber, privacy, backup, active, roleColor, roleHoist, roleMentionable, nameChanges, emojiChanges, roleRecreations, totalGuestsAdded, totalGuestsRemoved, guestCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, 0, 0, 0, 0, 0)`,
      [data.ownerId, data.guildId, data.channelId || null, data.roleId || null, data.name || 'Minha Call', data.emoji || '🎧', data.limitNumber || 5, data.privacy || 'public', data.backup || null, data.roleColor || '5865f2', data.roleHoist ? 1 : 0, data.roleMentionable ? 1 : 0]
    );
    return { success: true, id: result.lastID };
  } catch (err) {
    console.error('❌ Erro ao criar call:', err);
    return { success: false, error: err.message };
  }
}

async function getCallByOwner(ownerId) {
  try {
    return await getAsync(`SELECT * FROM calls WHERE ownerId = ? AND active = 1 ORDER BY createdAt DESC LIMIT 1`, [ownerId]);
  } catch (err) {
    console.error('❌ Erro ao buscar call do usuário:', err);
    return null;
  }
}

async function getCallById(callId) {
  try {
    return await getAsync(`SELECT * FROM calls WHERE id = ?`, [callId]);
  } catch (err) {
    console.error('❌ Erro ao buscar call:', err);
    return null;
  }
}

async function updateCall(callId, updates) {
  try {
    const entries = Object.entries(updates);
    if (entries.length === 0) return { success: true };

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, value]) => value);

    await runAsync(`UPDATE calls SET ${setClause}, updatedAt = ? WHERE id = ?`, [...values, new Date().toISOString(), callId]);
    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao atualizar call:', err);
    return { success: false, error: err.message };
  }
}

async function deleteCall(callId) {
  try {
    const now = new Date().toISOString();
    await runAsync(`UPDATE calls SET active = 0, deletedAt = ? WHERE id = ?`, [now, callId]);
    await runAsync(`UPDATE call_guests SET active = 0, removedAt = ? WHERE callId = ?`, [now, callId]);
    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao excluir call:', err);
    return { success: false, error: err.message };
  }
}

async function saveCallBackup(ownerId, guildId, data) {
  try {
    await runAsync(`INSERT INTO call_backups (ownerId, guildId, data) VALUES (?, ?, ?)`, [ownerId, guildId, JSON.stringify(data)]);
    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao salvar backup:', err);
    return { success: false, error: err.message };
  }
}

async function getLatestBackup(ownerId) {
  try {
    const row = await getAsync(`SELECT * FROM call_backups WHERE ownerId = ? ORDER BY createdAt DESC LIMIT 1`, [ownerId]);
    if (!row) return null;
    return JSON.parse(row.data);
  } catch (err) {
    console.error('❌ Erro ao buscar backup:', err);
    return null;
  }
}

async function addGuest(callId, userId, addedBy) {
  try {
    await runAsync(`INSERT INTO call_guests (callId, userId, addedBy, active) VALUES (?, ?, ?, 1)`, [callId, userId, addedBy]);
    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao adicionar convidado:', err);
    return { success: false, error: err.message };
  }
}

async function removeGuest(callId, userId) {
  try {
    const now = new Date().toISOString();
    await runAsync(`UPDATE call_guests SET active = 0, removedAt = ? WHERE callId = ? AND userId = ? AND active = 1`, [now, callId, userId]);
    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao remover convidado:', err);
    return { success: false, error: err.message };
  }
}

async function getActiveGuests(callId) {
  try {
    return await allAsync(`SELECT * FROM call_guests WHERE callId = ? AND active = 1 ORDER BY addedAt DESC`, [callId]);
  } catch (err) {
    console.error('❌ Erro ao buscar convidados:', err);
    return [];
  }
}

async function clearGuests(callId) {
  try {
    const now = new Date().toISOString();
    await runAsync(`UPDATE call_guests SET active = 0, removedAt = ? WHERE callId = ? AND active = 1`, [now, callId]);
    return { success: true };
  } catch (err) {
    console.error('❌ Erro ao limpar convidados:', err);
    return { success: false, error: err.message };
  }
}

// ====== OPERAÇÕES COM LOGS ======

async function addLog(logType, data = {}) {
  try {
    await runAsync(
      `INSERT INTO logs (logType, userId, targetUserId, vipType, benefitType, action, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        logType,
        data.userId || null,
        data.targetUserId || null,
        data.vipType || null,
        data.benefitType || null,
        data.action || null,
        data.details ? JSON.stringify(data.details) : null
      ]
    );
  } catch (err) {
    console.error('❌ Erro ao adicionar log:', err);
  }
}

async function getRecentLogs(limit = 50) {
  try {
    return await allAsync(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
  } catch (err) {
    console.error('❌ Erro ao buscar logs:', err);
    return [];
  }
}

module.exports = {
  addVip,
  renewVip,
  removeVip,
  getVip,
  getExpiredVips,
  getAllActiveVips,
  getVipsNearExpiration,
  updateReminderStamp,
  addBenefit,
  removeBenefit,
  getBenefit,
  getUserBenefits,
  countBenefitsByUser,
  getBenefitsGrantedByUser,
  createCall,
  getCallByOwner,
  getCallById,
  updateCall,
  deleteCall,
  saveCallBackup,
  getLatestBackup,
  addGuest,
  removeGuest,
  getActiveGuests,
  clearGuests,
  addLog,
  getRecentLogs
};
