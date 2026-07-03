/**
 * PERMISSIONS UTILITY - Funções para verificar permissões e limites
 */

const VipModel = require('../models/VipModel');
const config = require('../config.json');

// Definir limites de benefícios por tipo de VIP
const VIP_LIMITS = {
  chicago: {
    img: 1,
    imperial: 0,
    antban: 0
  },
  champagne: {
    img: 1,
    imperial: 1,
    antban: 0
  },
  ballena: {
    img: 1,
    imperial: 2,
    antban: 1
  },
  freestyle: {
    img: 1,
    imperial: 4,
    antban: 2
  },
  clickbait: {
    img: 0,
    imperial: 0,
    antban: 0
  }
};

/**
 * Verificar se o usuário é staff autorizado
 * @param {object} member - Member do Discord
 */
function isAuthorizedStaff(member) {
  try {
    if (!member) return false;
    return member.roles.cache.has(config.cargoStaffAutorizado);
  } catch (err) {
    console.error('❌ Erro ao verificar staff:', err);
    return false;
  }
}

/**
 * Verificar se o usuário tem um tipo de VIP específico
 * @param {string} userId - ID do usuário
 * @param {string} vipType - Tipo de VIP esperado (opcional)
 */
async function hasVip(userId, vipType = null) {
  try {
    const vip = await VipModel.getVip(userId);
    if (!vip) return false;
    
    if (vipType) {
      return vip.vipType === vipType;
    }
    return true;
  } catch (err) {
    console.error('❌ Erro ao verificar VIP:', err);
    return false;
  }
}

/**
 * Verificar se pode usar comando VIP
 * @param {string} userId - ID do usuário
 * @param {string} requiredVip - Tipo de VIP necessário (opcional, se não especificado qualquer VIP serve)
 */
async function canUseVipCommand(userId, requiredVip = null) {
  try {
    const vip = await VipModel.getVip(userId);
    if (!vip) return false;
    
    // Clickbait não pode usar comandos VIP
    if (vip.vipType === 'clickbait') return false;
    
    if (requiredVip) {
      return vip.vipType === requiredVip;
    }
    return true;
  } catch (err) {
    console.error('❌ Erro ao verificar acesso VIP:', err);
    return false;
  }
}

/**
 * Verificar se pode setar um tipo de benefício
 * @param {string} grantedByUserId - ID do usuário VIP
 * @param {string} benefitType - Tipo de benefício (img, imperial, antban)
 */
async function canSetBenefit(grantedByUserId, benefitType) {
  try {
    const vip = await VipModel.getVip(grantedByUserId);
    if (!vip) return { allowed: false, reason: 'Você não é VIP' };
    
    if (vip.vipType === 'clickbait') {
      return { allowed: false, reason: 'Clickbait não pode usar comandos VIP' };
    }
    
    const limits = VIP_LIMITS[vip.vipType];
    if (!limits || limits[benefitType] === 0) {
      return { allowed: false, reason: 'Você não possui permissão para setar esse cargo.' };
    }
    
    return { allowed: true, vipType: vip.vipType };
  } catch (err) {
    console.error('❌ Erro ao verificar permissão de benefício:', err);
    return { allowed: false, reason: 'Erro ao verificar permissões' };
  }
}

/**
 * Verificar limite de benefícios
 * @param {string} grantedByUserId - ID do usuário VIP
 * @param {string} benefitType - Tipo de benefício
 */
async function checkBenefitLimit(grantedByUserId, benefitType) {
  try {
    const vip = await VipModel.getVip(grantedByUserId);
    if (!vip) return { withinLimit: false, limit: 0, current: 0 };
    
    const limits = VIP_LIMITS[vip.vipType];
    if (!limits) return { withinLimit: false, limit: 0, current: 0 };
    
    const limit = limits[benefitType];
    const current = await VipModel.countBenefitsByUser(grantedByUserId, benefitType);
    
    return {
      withinLimit: current < limit,
      limit,
      current
    };
  } catch (err) {
    console.error('❌ Erro ao verificar limite:', err);
    return { withinLimit: false, limit: 0, current: 0 };
  }
}

/**
 * Obter limite de benefício para um VIP
 * @param {string} vipType - Tipo de VIP
 * @param {string} benefitType - Tipo de benefício
 */
function getBenefitLimit(vipType, benefitType) {
  const limits = VIP_LIMITS[vipType];
  if (!limits) return 0;
  return limits[benefitType] || 0;
}

/**
 * Obter todos os limites de um VIP
 * @param {string} vipType - Tipo de VIP
 */
function getVipLimits(vipType) {
  return VIP_LIMITS[vipType] || VIP_LIMITS.clickbait;
}

/**
 * Verificar se é um tipo de VIP válido
 * @param {string} vipType - Tipo de VIP
 */
function isValidVipType(vipType) {
  return ['clickbait', 'chicago', 'champagne', 'ballena', 'freestyle'].includes(vipType.toLowerCase());
}

module.exports = {
  isAuthorizedStaff,
  hasVip,
  canUseVipCommand,
  canSetBenefit,
  checkBenefitLimit,
  getBenefitLimit,
  getVipLimits,
  isValidVipType,
  VIP_LIMITS
};
