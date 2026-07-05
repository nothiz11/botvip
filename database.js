/**
 * DATABASE.JS - Configuração do banco de dados SQLite
 * Responsável por criar e gerenciar o banco de dados do bot VIP
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados
const dbPath = path.join(__dirname, 'vip_system.db');

// Criar ou abrir conexão com o banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado ao banco de dados SQLite');
});

/**
 * Garantir que uma coluna exista em uma tabela
 */
async function ensureColumn(tableName, columnName, definition) {
  try {
    const existing = await allAsync(`PRAGMA table_info(${tableName})`);
    if (!existing.some(col => col.name === columnName)) {
      await runAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
  } catch (err) {
    console.error(`❌ Erro ao verificar coluna ${tableName}.${columnName}:`, err);
  }
}

/**
 * Inicializar tabelas do banco de dados
 * Cria as tabelas se não existirem
 */
async function initializeTables() {
  try {
    await runAsync(`
      CREATE TABLE IF NOT EXISTS vips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT UNIQUE NOT NULL,
        vipType TEXT NOT NULL,
        startDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        expirationDate DATETIME NOT NULL,
        active INTEGER DEFAULT 1,
        renewals INTEGER DEFAULT 0,
        lastRenewalDate DATETIME,
        lastReminderDays TEXT
      )
    `);
    console.log('✅ Tabela vips inicializada');

    await runAsync(`
      CREATE TABLE IF NOT EXISTS vip_benefits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        benefitId TEXT UNIQUE NOT NULL,
        targetUserId TEXT NOT NULL,
        grantedByUserId TEXT NOT NULL,
        benefitType TEXT NOT NULL,
        grantedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        active INTEGER DEFAULT 1
      )
    `);
    console.log('✅ Tabela vip_benefits inicializada');

    await runAsync(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        logType TEXT NOT NULL,
        userId TEXT,
        targetUserId TEXT,
        vipType TEXT,
        benefitType TEXT,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      )
    `);
    console.log('✅ Tabela logs inicializada');

    await runAsync(`
      CREATE TABLE IF NOT EXISTS calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ownerId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        channelId TEXT,
        roleId TEXT,
        name TEXT DEFAULT 'Minha Call',
        emoji TEXT DEFAULT '🎧',
        limitNumber INTEGER DEFAULT 5,
        privacy TEXT DEFAULT 'public',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        backup TEXT,
        active INTEGER DEFAULT 1,
        roleColor TEXT DEFAULT '5865f2',
        roleHoist INTEGER DEFAULT 0,
        roleMentionable INTEGER DEFAULT 0,
        nameChanges INTEGER DEFAULT 0,
        emojiChanges INTEGER DEFAULT 0,
        roleRecreations INTEGER DEFAULT 0,
        totalGuestsAdded INTEGER DEFAULT 0,
        totalGuestsRemoved INTEGER DEFAULT 0,
        guestCount INTEGER DEFAULT 0,
        deletedAt DATETIME
      )
    `);
    console.log('✅ Tabela calls inicializada');

    await runAsync(`
      CREATE TABLE IF NOT EXISTS call_guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        callId INTEGER NOT NULL,
        userId TEXT NOT NULL,
        addedBy TEXT,
        addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        removedAt DATETIME,
        active INTEGER DEFAULT 1
      )
    `);
    console.log('✅ Tabela call_guests inicializada');

    await runAsync(`
      CREATE TABLE IF NOT EXISTS call_backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ownerId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela call_backups inicializada');

    await ensureColumn('vips', 'renewals', 'INTEGER DEFAULT 0');
    await ensureColumn('vips', 'lastRenewalDate', 'DATETIME');
    await ensureColumn('vips', 'lastReminderDays', 'TEXT');
    await ensureColumn('calls', 'limitNumber', 'INTEGER DEFAULT 5');
    await ensureColumn('calls', 'roleColor', 'TEXT DEFAULT "5865f2"');
    await ensureColumn('calls', 'roleHoist', 'INTEGER DEFAULT 0');
    await ensureColumn('calls', 'roleMentionable', 'INTEGER DEFAULT 0');
    await ensureColumn('calls', 'nameChanges', 'INTEGER DEFAULT 0');
    await ensureColumn('calls', 'emojiChanges', 'INTEGER DEFAULT 0');
    await ensureColumn('calls', 'roleRecreations', 'INTEGER DEFAULT 0');
    await ensureColumn('calls', 'totalGuestsAdded', 'INTEGER DEFAULT 0');
    await ensureColumn('calls', 'totalGuestsRemoved', 'INTEGER DEFAULT 0');
    await ensureColumn('calls', 'guestCount', 'INTEGER DEFAULT 0');
    await ensureColumn('calls', 'deletedAt', 'DATETIME');
  } catch (err) {
    console.error('❌ Erro ao inicializar tabelas:', err);
  }
}

/**
 * Executar query promise
 * Permite usar async/await com SQLite
 */
function runAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * Obter um resultado da query
 */
function getAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Obter todos os resultados da query
 */
function allAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Inicializar as tabelas ao carregar o módulo
initializeTables();

module.exports = {
  db,
  runAsync,
  getAsync,
  allAsync
};
