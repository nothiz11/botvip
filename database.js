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
 * Inicializar tabelas do banco de dados
 * Cria as tabelas se não existirem
 */
function initializeTables() {
  db.serialize(() => {
    // Tabela de VIPs
    db.run(`
      CREATE TABLE IF NOT EXISTS vips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT UNIQUE NOT NULL,
        vipType TEXT NOT NULL,
        startDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        expirationDate DATETIME NOT NULL,
        active INTEGER DEFAULT 1
      )
    `, (err) => {
      if (err) console.error('❌ Erro ao criar tabela vips:', err);
      else console.log('✅ Tabela vips inicializada');
    });

    // Tabela de benefícios
    db.run(`
      CREATE TABLE IF NOT EXISTS vip_benefits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        benefitId TEXT UNIQUE NOT NULL,
        targetUserId TEXT NOT NULL,
        grantedByUserId TEXT NOT NULL,
        benefitType TEXT NOT NULL,
        grantedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        active INTEGER DEFAULT 1
      )
    `, (err) => {
      if (err) console.error('❌ Erro ao criar tabela vip_benefits:', err);
      else console.log('✅ Tabela vip_benefits inicializada');
    });

    // Tabela de logs
    db.run(`
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
    `, (err) => {
      if (err) console.error('❌ Erro ao criar tabela logs:', err);
      else console.log('✅ Tabela logs inicializada');
    });
  });
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
