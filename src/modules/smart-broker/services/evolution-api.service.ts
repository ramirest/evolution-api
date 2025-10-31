import axios, { AxiosInstance } from 'axios';

/**
 * Serviço para interagir com a Evolution API
 * Wrapper interno para chamadas à API nativa da Evolution
 */
export class EvolutionApiService {
  private client: AxiosInstance;

  constructor() {
    // A Evolution API roda no mesmo processo, então usamos localhost
    const baseURL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY;

    console.log('[EvolutionApiService] Initializing with:', { baseURL, hasApiKey: !!apiKey });

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { apikey: apiKey }),
      },
      timeout: 30000,
    });
  }

  /**
   * Listar todas as instâncias (sem filtro)
   */
  async listAllInstances(): Promise<any[]> {
    const response = await this.client.get('/instance/fetchInstances');
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Criar nova instância
   */
  async createInstance(data: {
    instanceName: string;
    token?: string;
    number?: string;
    qrcode?: boolean;
    webhook?: string;
  }): Promise<any> {
    const response = await this.client.post('/instance/create', {
      instanceName: data.instanceName,
      token: data.token,
      number: data.number,
      qrcode: data.qrcode !== false, // default true
      integration: 'WHATSAPP-BAILEYS', // Required by Evolution API
      ...(data.webhook && {
        webhook: true,
        webhookUrl: data.webhook,
      }),
    });
    return response.data;
  }

  /**
   * Deletar instância
   */
  async deleteInstance(instanceName: string): Promise<void> {
    await this.client.delete(`/instance/delete/${encodeURIComponent(instanceName)}`);
  }

  /**
   * Conectar instância (obter QR Code)
   */
  async connectInstance(instanceName: string): Promise<any> {
    const response = await this.client.get(`/instance/connect/${encodeURIComponent(instanceName)}`);
    return response.data;
  }

  /**
   * Desconectar instância
   */
  async disconnectInstance(instanceName: string): Promise<void> {
    await this.client.delete(`/instance/logout/${encodeURIComponent(instanceName)}`);
  }

  /**
   * Reiniciar instância
   */
  async restartInstance(instanceName: string): Promise<any> {
    const response = await this.client.put(`/instance/restart/${encodeURIComponent(instanceName)}`);
    return response.data;
  }

  /**
   * Obter QR Code
   */
  async getQRCode(instanceName: string): Promise<any> {
    const response = await this.client.get(`/instance/qrcode/${encodeURIComponent(instanceName)}`);
    return response.data;
  }

  /**
   * Obter status da conexão
   */
  async getConnectionStatus(instanceName: string): Promise<any> {
    const response = await this.client.get(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
    return response.data;
  }

  /**
   * Configurar webhook
   */
  async setWebhook(instanceName: string, webhookUrl: string): Promise<void> {
    await this.client.post(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      url: webhookUrl,
      enabled: true,
    });
  }
}

// Singleton instance
export const evolutionApiService = new EvolutionApiService();
