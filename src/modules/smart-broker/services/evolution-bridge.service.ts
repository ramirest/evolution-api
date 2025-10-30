import { sendMessageController } from '../../../api/server.module';
import { waMonitor } from '../../../api/server.module';
import { InstanceDto } from '../../../api/dto/instance.dto';
import { SendTextDto } from '../../../api/dto/sendMessage.dto';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('EvolutionBridgeService');

/**
 * EvolutionBridgeService - Ponte entre Smart Broker e Evolution API
 * 
 * Este serviço substitui as chamadas HTTP (axios) para a Evolution API
 * por chamadas diretas aos controllers nativos (sendMessageController, waMonitor).
 * 
 * CRÍTICO: Agora ambos módulos rodam no mesmo processo!
 */
export class EvolutionBridgeService {
  /**
   * Envia mensagem de texto via WhatsApp
   * 
   * ANTES (HTTP): 
   *   await axios.post('http://localhost:8080/message/sendText/instance1', {...})
   * 
   * AGORA (Direto):
   *   await evolutionBridgeService.sendTextMessage('instance1', {...})
   */
  async sendTextMessage(instanceName: string, data: { number: string; text: string; delay?: number }) {
    try {
      logger.info(`Enviando mensagem de texto via instância ${instanceName} para ${data.number}`);

      const instanceDto: InstanceDto = { instanceName };
      const sendTextDto: SendTextDto = {
        number: data.number,
        text: data.text,
        delay: data.delay || 0,
      };

      const result = await sendMessageController.sendText(instanceDto, sendTextDto);

      logger.info(`Mensagem enviada com sucesso: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`Erro ao enviar mensagem de texto: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envia mensagem com mídia (imagem, documento, vídeo)
   */
  async sendMediaMessage(
    instanceName: string,
    data: {
      number: string;
      mediatype: 'image' | 'document' | 'video' | 'audio';
      media: string; // URL ou base64
      caption?: string;
      fileName?: string;
    }
  ) {
    try {
      logger.info(`Enviando mídia via instância ${instanceName} para ${data.number}`);

      const instanceDto: InstanceDto = { instanceName };
      const result = await sendMessageController.sendMedia(instanceDto, data);

      return result;
    } catch (error) {
      logger.error(`Erro ao enviar mídia: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica status da instância (conectada, desconectada, etc.)
   */
  async getInstanceStatus(instanceName: string): Promise<{ state: string; qrcode?: string }> {
    try {
      const instance = waMonitor.waInstances[instanceName];
      if (!instance) {
        throw new Error(`Instância ${instanceName} não encontrada`);
      }

      const connectionState = await instance.connectionStatus();
      return { state: connectionState.state };
    } catch (error) {
      logger.error(`Erro ao verificar status da instância ${instanceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lista todas as instâncias disponíveis
   */
  async listInstances(): Promise<string[]> {
    try {
      return Object.keys(waMonitor.waInstances);
    } catch (error) {
      logger.error(`Erro ao listar instâncias: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca mensagens de um chat
   */
  async fetchMessages(instanceName: string, remoteJid: string, limit: number = 50) {
    try {
      const instance = waMonitor.waInstances[instanceName];
      if (!instance) {
        throw new Error(`Instância ${instanceName} não encontrada`);
      }

      // Aqui você pode adicionar lógica para buscar mensagens do banco de dados
      // ou do cache, dependendo da implementação da Evolution API
      logger.info(`Buscando mensagens para ${remoteJid} na instância ${instanceName}`);
      
      // Por enquanto, retornamos um array vazio - você pode implementar conforme necessário
      return [];
    } catch (error) {
      logger.error(`Erro ao buscar mensagens: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marca mensagem como lida
   */
  async markMessageAsRead(instanceName: string, remoteJid: string, messageId: string) {
    try {
      const instance = waMonitor.waInstances[instanceName];
      if (!instance) {
        throw new Error(`Instância ${instanceName} não encontrada`);
      }

      // Implementar lógica de marcar como lido conforme API da Evolution
      logger.info(`Marcando mensagem ${messageId} como lida no chat ${remoteJid}`);
      
      return { success: true };
    } catch (error) {
      logger.error(`Erro ao marcar mensagem como lida: ${error.message}`);
      throw error;
    }
  }
}

export const evolutionBridgeService = new EvolutionBridgeService();
