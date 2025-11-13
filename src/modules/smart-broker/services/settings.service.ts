import { SettingsModel, ISettings, IntegrationSettings } from '../models/settings.model';
import { AuthenticatedUser } from '../types/auth.types';
import { NotFoundException, ForbiddenException } from '../../../exceptions';
import { Logger } from '../../../config/logger.config';
import { encrypt, decrypt } from '../utils/encryption.util';

const logger = new Logger('SettingsService');

export interface UpdateIntegrationsDto {
  ai?: Partial<IntegrationSettings['ai']>;
  email?: Partial<IntegrationSettings['email']>;
  sms?: Partial<IntegrationSettings['sms']>;
  analytics?: Partial<IntegrationSettings['analytics']>;
  upload?: Partial<IntegrationSettings['upload']>;
}

/**
 * SettingsService - Gerenciamento de Configurações da Agência
 */
export class SettingsService {
  /**
   * Buscar configurações da agência
   */
  async getByAgency(user: AuthenticatedUser): Promise<ISettings> {
    let settings = await SettingsModel.findOne({ agencyId: user.agencyId }).exec();

    // Se não existir, criar com valores padrão
    if (!settings) {
      logger.info(`Criando configurações padrão para agência ${user.agencyId}`);
      settings = await SettingsModel.create({
        agencyId: user.agencyId,
        integrations: {
          ai: {
            enabled: false,
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: '',
            features: {
              chat: true,
              analysis: true,
              recommendations: true,
              automation: false,
            },
          },
          email: {
            enabled: false,
            provider: 'smtp',
            from: '',
          },
          sms: {
            enabled: false,
            provider: 'twilio',
            from: '',
          },
          analytics: {
            enabled: false,
            provider: 'google',
          },
          upload: {
            enabled: false,
            provider: 'cloudinary',
            maxSizeBytes: 10485760,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          },
        },
      });
    }

    return settings;
  }

  /**
   * Atualizar integrações
   */
  async updateIntegrations(
    user: AuthenticatedUser,
    updates: UpdateIntegrationsDto,
  ): Promise<ISettings> {
    const settings = await this.getByAgency(user);

    // Merge das atualizações
    if (updates.ai) {
      settings.integrations.ai = { ...settings.integrations.ai, ...updates.ai };
      
      // Criptografar API key se fornecida
      if (updates.ai.apiKey) {
        settings.integrations.ai.apiKey = encrypt(updates.ai.apiKey);
      }
    }

    if (updates.email) {
      settings.integrations.email = { ...settings.integrations.email, ...updates.email };
      
      // Criptografar credenciais sensíveis
      if (updates.email.smtpPass) {
        settings.integrations.email.smtpPass = encrypt(updates.email.smtpPass);
      }
      if (updates.email.apiKey) {
        settings.integrations.email.apiKey = encrypt(updates.email.apiKey);
      }
    }

    if (updates.sms) {
      settings.integrations.sms = { ...settings.integrations.sms, ...updates.sms };
      
      // Criptografar credenciais
      if (updates.sms.authToken) {
        settings.integrations.sms.authToken = encrypt(updates.sms.authToken);
      }
      if (updates.sms.apiKey) {
        settings.integrations.sms.apiKey = encrypt(updates.sms.apiKey);
      }
      if (updates.sms.apiSecret) {
        settings.integrations.sms.apiSecret = encrypt(updates.sms.apiSecret);
      }
    }

    if (updates.analytics) {
      settings.integrations.analytics = { ...settings.integrations.analytics, ...updates.analytics };
      
      if (updates.analytics.apiKey) {
        settings.integrations.analytics.apiKey = encrypt(updates.analytics.apiKey);
      }
    }

    if (updates.upload) {
      settings.integrations.upload = { ...settings.integrations.upload, ...updates.upload };
      
      // Criptografar credenciais dos provedores
      if (updates.upload.s3?.secretAccessKey) {
        settings.integrations.upload.s3!.secretAccessKey = encrypt(updates.upload.s3.secretAccessKey);
      }
      if (updates.upload.cloudinary?.apiSecret) {
        settings.integrations.upload.cloudinary!.apiSecret = encrypt(updates.upload.cloudinary.apiSecret);
      }
      if (updates.upload.cloudflare?.apiToken) {
        settings.integrations.upload.cloudflare!.apiToken = encrypt(updates.upload.cloudflare.apiToken);
      }
    }

    await settings.save();
    
    logger.info(`Configurações atualizadas para agência ${user.agencyId}`);
    
    return settings;
  }

  /**
   * Obter configuração de IA descriptografada (para uso interno)
   */
  async getAiConfig(agencyId: string): Promise<{
    enabled: boolean;
    provider: 'openai' | 'google' | 'anthropic';
    model: string;
    apiKey: string;
  }> {
    const settings = await SettingsModel.findOne({ agencyId }).exec();

    if (!settings) {
      return {
        enabled: false,
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: '',
      };
    }

    const ai = settings.integrations.ai;
    
    return {
      enabled: ai.enabled && !!ai.apiKey,
      provider: ai.provider,
      model: ai.model,
      apiKey: ai.apiKey ? decrypt(ai.apiKey) : '',
    };
  }

  /**
   * Testar conexão de uma integração
   */
  async testIntegration(
    user: AuthenticatedUser,
    type: 'ai' | 'email' | 'sms' | 'analytics' | 'upload',
  ): Promise<{ success: boolean; message: string }> {
    const settings = await this.getByAgency(user);

    switch (type) {
      case 'ai':
        const ai = settings.integrations.ai;
        if (!ai.enabled || !ai.apiKey) {
          return { success: false, message: 'IA não configurada ou API key ausente' };
        }
        
        // TODO: Implementar teste real de conexão com OpenAI/Google/Anthropic
        return { success: true, message: 'Configuração de IA válida' };

      case 'email':
        const email = settings.integrations.email;
        if (!email.enabled) {
          return { success: false, message: 'Email não configurado' };
        }
        
        // TODO: Implementar teste de envio de email
        return { success: true, message: 'Configuração de email válida' };

      case 'sms':
        const sms = settings.integrations.sms;
        if (!sms.enabled) {
          return { success: false, message: 'SMS não configurado' };
        }
        
        // TODO: Implementar teste de SMS
        return { success: true, message: 'Configuração de SMS válida' };

      case 'analytics':
        const analytics = settings.integrations.analytics;
        if (!analytics.enabled) {
          return { success: false, message: 'Analytics não configurado' };
        }
        
        return { success: true, message: 'Configuração de analytics válida' };

      case 'upload':
        const upload = settings.integrations.upload;
        if (!upload.enabled) {
          return { success: false, message: 'Upload não configurado' };
        }
        
        // TODO: Implementar teste de upload
        return { success: true, message: 'Configuração de upload válida' };

      default:
        return { success: false, message: 'Tipo de integração desconhecido' };
    }
  }
}

export const settingsService = new SettingsService();
