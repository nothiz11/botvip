/**
 * ARQUIVO PRINCIPAL - index.js
 * Inicializa e gerencia o bot Discord
 */

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Validar configuração
if (config.token === 'YOUR_BOT_TOKEN_HERE' || !config.token) {
  console.error('❌ ERRO: Token não configurado em config.json');
  process.exit(1);
}

if (config.guildId === 'YOUR_GUILD_ID' || !config.guildId) {
  console.error('❌ ERRO: Guild ID não configurado em config.json');
  process.exit(1);
}

// ====== CRIAR CLIENT DO BOT ======

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// ====== CARREGAR EVENTOS ======

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  // Registrar evento
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
    console.log(`✅ Evento carregado: ${event.name} (executar uma vez)`);
  } else {
    client.on(event.name, (...args) => event.execute(...args));
    console.log(`✅ Evento carregado: ${event.name}`);
  }
}

// ====== GERENCIADOR DE ERROS ======

// Tratador de erro não capturado
process.on('unhandledRejection', error => {
  console.error('❌ Erro não tratado:', error);
});

// Tratador de exceção não capturada
process.on('uncaughtException', error => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

// ====== CONECTAR BOT ======

console.log(`
${'═'.repeat(50)}
🤖 Rivex VIP System Bot
${'═'.repeat(50)}
`);

client.login(config.token).catch(err => {
  console.error('❌ Erro ao fazer login:', err);
  process.exit(1);
});
