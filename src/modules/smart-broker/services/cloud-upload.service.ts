import { SettingsModel } from '../models/settings.model';
import { IUploadProvider, UploadProvider, UploadResult } from './upload/types/upload-provider.types';
import { S3UploadProvider } from './upload/providers/s3.provider';
import { CloudinaryUploadProvider } from './upload/providers/cloudinary.provider';
import { decrypt } from '../utils/encryption.util';

/**
 * Serviço para upload em cloud providers (S3, Cloudinary, etc.)
 * Lê as configurações de IntegrationSettings por agência
 */
export class CloudUploadService {
  private providerCache: Map<string, IUploadProvider> = new Map();

  /**
   * Descriptografa um valor se ele contiver ':'
   * (formato usado pelo encryption.util: iv:encryptedData)
   */
  private decryptIfNeeded(value: string): string {
    if (!value) return value;
    
    // Detectar se está criptografado (contém ':' que é o separador IV:dados)
    if (typeof value === 'string' && value.includes(':')) {
      try {
        const decrypted = decrypt(value);
        if (decrypted) {
          return decrypted.trim();
        }
      } catch (error) {
        console.error('[CloudUploadService] Decryption failed:', error);
        return value; // Retornar valor original se falhar
      }
    }
    
    return value.trim();
  }

  /**
   * Limpa e valida credenciais Cloudinary
   */
  private sanitizeCloudinaryCredentials(cloudinary: any) {
    if (!cloudinary) return cloudinary;

    return {
      cloudName: cloudinary.cloudName?.toString().trim() || '',
      apiKey: cloudinary.apiKey?.toString().trim() || '', // apiKey NÃO é criptografado
      apiSecret: this.decryptIfNeeded(cloudinary.apiSecret?.toString() || ''), // apiSecret É criptografado
      folder: cloudinary.folder?.toString().trim(),
    };
  }

  /**
   * Busca configurações de upload da agência
   */
  private async getUploadConfig(agencyId: string) {
    const settings = await SettingsModel.findOne({ agencyId }).exec();

    if (!settings || !settings.integrations.upload || !settings.integrations.upload.enabled) {
      throw new Error('Upload service not configured or disabled');
    }

    // Converter para objeto plain para evitar problemas com Mongoose
    const settingsObj = settings.toObject ? settings.toObject() : JSON.parse(JSON.stringify(settings));
    const uploadConfig = JSON.parse(JSON.stringify(settingsObj.integrations.upload));

    // Sanitizar e validar credenciais Cloudinary
    if (uploadConfig.cloudinary) {
      uploadConfig.cloudinary = this.sanitizeCloudinaryCredentials(uploadConfig.cloudinary);
      
      // Log para debug (ATENÇÃO: Remover em produção!)
      console.log('[CloudUploadService] Cloudinary config loaded:', {
        cloudName: uploadConfig.cloudinary.cloudName,
        apiKeyLength: uploadConfig.cloudinary.apiKey?.length || 0,
        apiSecretLength: uploadConfig.cloudinary.apiSecret?.length || 0,
        hasApiKey: !!uploadConfig.cloudinary.apiKey,
        hasApiSecret: !!uploadConfig.cloudinary.apiSecret,
      });
    }

    // Sanitizar credenciais S3 se necessário
    if (uploadConfig.s3) {
      uploadConfig.s3.accessKeyId = this.decryptIfNeeded(uploadConfig.s3.accessKeyId?.toString().trim() || '');
      uploadConfig.s3.secretAccessKey = this.decryptIfNeeded(uploadConfig.s3.secretAccessKey?.toString().trim() || '');
    }

    return uploadConfig;
  }

  /**
   * Retorna o provider de upload para a agência (com cache)
   */
  private async getProvider(agencyId: string): Promise<IUploadProvider> {
    // Verificar cache
    if (this.providerCache.has(agencyId)) {
      return this.providerCache.get(agencyId)!;
    }

    const config = await this.getUploadConfig(agencyId);
    let provider: IUploadProvider;

    const options = {
      maxSizeBytes: config.maxSizeBytes,
      allowedMimeTypes: config.allowedMimeTypes,
    };

    switch (config.provider) {
      case UploadProvider.S3:
        if (!config.s3.accessKeyId || !config.s3.secretAccessKey || !config.s3.region || !config.s3.bucket) {
          throw new Error('S3 credentials incomplete');
        }
        provider = new S3UploadProvider(config.s3 as any, options);
        break;

      case UploadProvider.CLOUDINARY:
        if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
          console.error('[CloudUploadService] Cloudinary credentials validation failed:', {
            hasCloudName: !!config.cloudinary.cloudName,
            hasApiKey: !!config.cloudinary.apiKey,
            hasApiSecret: !!config.cloudinary.apiSecret,
            cloudName: config.cloudinary.cloudName,
          });
          throw new Error('Cloudinary credentials incomplete');
        }
        
        // Validar que as credenciais não estão vazias após trim
        if (config.cloudinary.cloudName.length === 0 || 
            config.cloudinary.apiKey.length === 0 || 
            config.cloudinary.apiSecret.length === 0) {
          throw new Error('Cloudinary credentials are empty after sanitization');
        }
        
        console.log('[CloudUploadService] Creating Cloudinary provider with valid credentials');
        provider = new CloudinaryUploadProvider(config.cloudinary as any, options);
        break;

      // TODO: Adicionar Google Cloud e Cloudflare quando necessário
      // case UploadProvider.GOOGLE_CLOUD:
      // case UploadProvider.CLOUDFLARE:

      default:
        throw new Error(`Unsupported upload provider: ${config.provider}`);
    }

    // Cachear o provider
    this.providerCache.set(agencyId, provider);
    return provider;
  }

  /**
   * Upload de arquivo para o provider configurado
   */
  async uploadFile(agencyId: string, file: any, folder?: string): Promise<UploadResult> {
    try {
      const provider = await this.getProvider(agencyId);
      const result = await provider.upload(file, folder);
      console.log('[CloudUploadService] Upload successful:', { url: result.url, provider: result.provider });
      return result;
    } catch (error: any) {
      console.error('[CloudUploadService] Upload error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to upload file');
    }
  }

  /**
   * Deletar arquivo do provider configurado
   */
  async deleteFile(agencyId: string, fileUrl: string): Promise<void> {
    try {
      const provider = await this.getProvider(agencyId);
      await provider.delete(fileUrl);
    } catch (error: any) {
      console.error('Delete error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete file');
    }
  }

  /**
   * Testar conexão com o provider configurado
   */
  async testConnection(agencyId: string): Promise<boolean> {
    try {
      const provider = await this.getProvider(agencyId);
      return await provider.testConnection();
    } catch (error) {
      console.error('Connection test error:', error);
      return false;
    }
  }

  /**
   * Limpar cache do provider (após alterar configurações)
   */
  clearProviderCache(agencyId?: string): void {
    if (agencyId) {
      this.providerCache.delete(agencyId);
    } else {
      this.providerCache.clear();
    }
  }
}

// Singleton
export const cloudUploadService = new CloudUploadService();
