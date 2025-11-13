import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { BaseUploadProvider } from './base.provider';
import { CloudinaryCredentials, UploadResult, UploadProvider } from '../types/upload-provider.types';

/**
 * Provider de upload para Cloudinary
 */
export class CloudinaryUploadProvider extends BaseUploadProvider {
  constructor(
    private credentials: CloudinaryCredentials,
    private options?: { maxSizeBytes?: number; allowedMimeTypes?: string[] },
  ) {
    super();

    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
    });

    // Testar conexão imediatamente para validar credenciais
    this.validateConnection().catch((err) => {
      console.error('[CloudinaryProvider] Connection validation failed:', err.message);
    });
  }

  private async validateConnection(): Promise<void> {
    try {
      await cloudinary.api.ping();
    } catch (error: any) {
      console.error('[CloudinaryProvider] Connection test failed:', error.message);
      throw new Error(`Cloudinary connection failed: ${error.message}`);
    }
  }

  async upload(file: any, folder?: string): Promise<UploadResult> {
    this.validateFile(file, this.options?.allowedMimeTypes, this.options?.maxSizeBytes);

    return new Promise((resolve, reject) => {
      const uploadFolder = folder || this.credentials.folder || 'uploads';

      cloudinary.uploader
        .upload_stream(
          {
            folder: uploadFolder,
            resource_type: 'auto',
          },
          (error, result: UploadApiResponse | undefined) => {
            if (error || !result) {
              reject(error || new Error('Upload failed'));
              return;
            }

            resolve({
              url: result.secure_url,
              publicUrl: result.secure_url,
              fileName: result.public_id,
              mimeType: file.mimetype,
              size: result.bytes,
              provider: UploadProvider.CLOUDINARY,
              metadata: {
                publicId: result.public_id,
                format: result.format,
                resourceType: result.resource_type,
              },
            });
          }
        )
        .end(file.buffer);
    });
  }

  async delete(fileUrl: string): Promise<void> {
    // Extrair public_id da URL
    const urlParts = fileUrl.split('/');
    const publicIdWithExt = urlParts.slice(-2).join('/');
    const publicId = publicIdWithExt.split('.')[0];

    await cloudinary.uploader.destroy(publicId);
  }

  async testConnection(): Promise<boolean> {
    try {
      await cloudinary.api.ping();
      return true;
    } catch (error) {
      console.error('Cloudinary connection test failed:', error);
      return false;
    }
  }
}
