/**
 * MESSAGE UTILITY - Funções para gerenciar mensagens
 * Inclui auto-delete de respostas do bot e da mensagem do usuário
 */

/**
 * Enviar mensagem e deletar automaticamente (sem reply para evitar erro se original foi deletada)
 * @param {object} message - Mensagem do Discord
 * @param {object} options - Opções da resposta
 * @param {number} deleteAfter - Tempo em ms para deletar resposta (padrão 5000ms = 5s)
 * @param {boolean} deleteOriginal - Se deve deletar a mensagem original (padrão true)
 * @param {number} deleteOriginalAfter - Tempo em ms para deletar original (padrão 1000ms = 1s)
 */
async function sendAndDelete(message, options, deleteAfter = 5000, deleteOriginal = true, deleteOriginalAfter = 1000) {
  try {
    // Enviar como channel.send em vez de reply para evitar erro se a mensagem original for deletada
    const response = await message.channel.send(options);
    
    // Deletar resposta do bot após o tempo especificado
    setTimeout(() => {
      response.delete().catch(err => {
        if (err?.code !== 10008) {
          console.error('❌ Erro ao deletar resposta do bot:', err);
        }
      });
    }, deleteAfter);
    
    // Deletar mensagem original do usuário
    if (deleteOriginal) {
      setTimeout(async () => {
        try {
          if (message.deletable) {
            await message.delete();
          }
        } catch (err) {
          if (err?.code !== 10008) {
            console.error('❌ Erro ao deletar mensagem original:', err);
          }
        }
      }, deleteOriginalAfter);
    }
    
    return response;
  } catch (err) {
    console.error('❌ Erro ao enviar mensagem:', err);
    return null;
  }
}

/**
 * Deletar mensagem com delay opcional
 * @param {object} message - Mensagem a deletar
 * @param {number} delay - Delay em ms antes de deletar (padrão 0)
 */
async function deleteMessage(message, delay = 0) {
  try {
    if (delay > 0) {
      setTimeout(() => {
        message.delete().catch(err => console.error('❌ Erro ao deletar mensagem:', err));
      }, delay);
    } else {
      await message.delete();
    }
  } catch (err) {
    if (err?.code !== 10008) {
      console.error('❌ Erro ao deletar mensagem:', err);
    }
  }
}

module.exports = {
  sendAndDelete,
  deleteMessage
};
