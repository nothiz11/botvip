/**
 * EVENT: messageCreate
 * Gerencia a execução de comandos quando uma mensagem é enviada
 */

const config = require('../config.json');
const fs = require('fs');
const path = require('path');
const { sendAndDelete } = require('../utils/messages');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    try {
      // Ignorar mensagens de bots
      if (message.author.bot) return;
      
      // Verificar se é um comando (verifica o prefixo)
      if (!message.content.startsWith(config.prefix)) return;
      
      // Extrair comando e argumentos
      const args = message.content.slice(config.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      
      // Buscar arquivo do comando
      const commandPath = path.join(__dirname, '..', 'commands', `${commandName}.js`);
      
      // Verificar se o comando existe
      if (!fs.existsSync(commandPath)) {
        return await sendAndDelete(message, {
          embeds: [{
            color: 0xe74c3c,
            title: '❌ Comando Não Encontrado',
            description: `O comando \`${config.prefix}${commandName}\` não existe.`,
            timestamp: new Date()
          }]
        });
      }
      
      // Carregar e executar comando
      try {
        const command = require(commandPath);
        await command.execute(message, args);
      } catch (err) {
        console.error(`❌ Erro ao executar comando ${commandName}:`, err);
        await sendAndDelete(message, {
          embeds: [{
            color: 0xe74c3c,
            title: '❌ Erro ao Executar',
            description: 'Ocorreu um erro ao executar o comando.',
            timestamp: new Date()
          }]
        }).catch(err => console.error('❌ Erro ao responder:', err));
      }
      
    } catch (err) {
      console.error('❌ Erro no evento messageCreate:', err);
    }
  }
};
