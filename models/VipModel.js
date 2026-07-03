/**
 * VIP MODEL - Modelos para gerenciar VIPs no banco de dados
 */

const { db, runAsync, getAsync, allAsync } = require('../database');

// ====== OPERAÇÕES COM VIPs ======

/**
 * Adicionar novo VIP
 * @param {string} userId - ID do usuário
 * @param {string} vipType - Tipo de VIP (chicago, champagne, ballena, freestyle, clickbait)
 * @param {number} daysValid - Número de dias de validade (padrão 30)
 */
async function addVip(userId, vipType, daysValid = 30) {
  try {
    const now = new Date();
    const expiration = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000);
    
    await runAsync(
      `INSERT INTO vips (userId, vipType, expirationDate, active) 
       VALUES (?, ?, ?, 1)
       ON CONFLICT(userId) DO UPDATE SET vipType = ?, expirationDate = ?, active = 1`,
      [userId, vipType, expiration.toISOString(), vipType, expiration.toISOString()]
    );
    
    return { success: true, expiration };
  } catch (err) {
    console.error('❌ Erro ao adicionar VIP:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remover VIP de um usuário
 * @param {string} userId - ID do usuário
 */
async function removeVip(userId) {
  try {
    const vip = await getVip(userId);
    if (!vip) return { success: false, error: 'Usuário não é VIP' };
    
    await runAsync(
      `UPDATE vips SET active = 0 WHERE userId = ?`,
      [userId]
    );
    
    // Remove todos os benefícios associados
    await runAsync(
      `UPDATE vip_benefits SET active = 0 WHERE targetUserId = ?`,
      [userId]
    );
    
    return { success: true, vipType: vip.vipType };
  } catch (err) {
    console.error('❌ Erro ao remover VIP:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obter informações do VIP de um usuário
 * @param {string} userId - ID do usuário
 */
async function getVip(userId) {
  try {
    const vip = await getAsync(
      `SELECT * FROM vips WHERE userId = ? AND active = 1`,
      [userId]
    );
    return vip;
  } catch (err) {
    console.error('❌ Erro ao buscar VIP:', err);
    return null;
  }
}

/**
 * Obter todos os VIPs expirados
 */
async function getExpiredVips() {
  try {
    const now = new Date().toISOString();
    const vips = await allAsync(
      `SELECT * FROM vips WHERE active = 1 AND expirationDate < ?`,
      [now]
    );
    return vips;
  } catch (err) {
    console.error('❌ Erro ao buscar VIPs expirados:', err);
    return [];
  }
}

// ====== OPERAÇÕES COM BENEFÍCIOS ======

/**
 * Adicionar benefício a um usuário
 * @param {string} targetUserId - ID do usuário que vai receber o benefício
 * @param {string} grantedByUserId - ID do usuário que está setando o benefício
 * @param {string} benefitType - Tipo de benefício (img, imperial, antban)
 */
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

/**
 * Remover benefício de um usuário
 * @param {string} targetUserId - ID do usuário
 * @param {string} benefitType - Tipo de benefício
 * @param {string} grantedByUserId - ID do usuário que setou (verificação)
 */
async function removeBenefit(targetUserId, benefitType, grantedByUserId) {
  try {
    const benefit = await getBenefit(targetUserId, benefitType, grantedByUserId);
    
    if (!benefit) {
      return { success: false, error: 'Benefício não encontrado' };
    }
    
    // Verificar se é o mesmo que setou
    if (benefit.grantedByUserId !== grantedByUserId) {
      return { success: false, error: 'Apenas quem setou pode remover' };
    }
    
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

/**
 * Obter benefício específico
 * @param {string} targetUserId - ID do usuário
 * @param {string} benefitType - Tipo de benefício
 */
async function getBenefit(targetUserId, benefitType, grantedByUserId = null) {
  try {
    let query = `SELECT * FROM vip_benefits 
       WHERE targetUserId = ? AND benefitType = ? AND active = 1`;
    const params = [targetUserId, benefitType];
    
    if (grantedByUserId) {
      query += ' AND grantedByUserId = ?';
      params.push(grantedByUserId);
    }
    
    const benefit = await getAsync(query, params);
    return benefit;
  } catch (err) {
    console.error('❌ Erro ao buscar benefício:', err);
    return null;
  }
}

/**
 * Obter todos os benefícios de um usuário
 * @param {string} targetUserId - ID do usuário
 */
async function getUserBenefits(targetUserId) {
  try {
    const benefits = await allAsync(
      `SELECT * FROM vip_benefits WHERE targetUserId = ? AND active = 1`,
      [targetUserId]
    );
    return benefits;
  } catch (err) {
    console.error('❌ Erro ao buscar benefícios:', err);
    return [];
  }
}

/**
 * Contar benefícios de um tipo concedidos por um usuário
 * @param {string} grantedByUserId - ID do usuário que setou
 * @param {string} benefitType - Tipo de benefício
 */
async function countBenefitsByUser(grantedByUserId, benefitType) {
  try {
    const result = await getAsync(
      `SELECT COUNT(*) as count FROM vip_benefits 
       WHERE grantedByUserId = ? AND benefitType = ? AND active = 1`,
      [grantedByUserId, benefitType]
    );
    return result.count;
  } catch (err) {
    console.error('❌ Erro ao contar benefícios:', err);
    return 0;
  }
}

/**
 * Obter todos os benefícios concedidos por um usuário
 * @param {string} grantedByUserId - ID do usuário VIP
 */
async function getBenefitsGrantedByUser(grantedByUserId) {
  try {
    const benefits = await allAsync(
      `SELECT * FROM vip_benefits WHERE grantedByUserId = ? AND active = 1`,
      [grantedByUserId]
    );
    return benefits;
  } catch (err) {
    console.error('❌ Erro ao buscar benefícios do usuário:', err);
    return [];
  }
}

// ====== OPERAÇÕES COM LOGS ======

/**
 * Registrar log
 * @param {string} logType - Tipo de log (vip_added, vip_removed, vip_expired, benefit_added, benefit_removed, permission_error)
 * @param {object} data - Dados do log
 */
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

/**
 * Obter logs recentes
 * @param {number} limit - Limite de logs (padrão 50)
 */
async function getRecentLogs(limit = 50) {
  try {
    const logs = await allAsync(
      `SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    return logs;
  } catch (err) {
    console.error('❌ Erro ao buscar logs:', err);
    return [];
  }
}

module.exports = {
  // VIPs
  addVip,
  removeVip,
  getVip,
  getExpiredVips,
  
  // Benefícios
  addBenefit,
  removeBenefit,
  getBenefit,
  getUserBenefits,
  countBenefitsByUser,
  getBenefitsGrantedByUser,
  
  // Logs
  addLog,
  getRecentLogs
};
