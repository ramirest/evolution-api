import { IUploadProvider, UploadResult } from '../types/upload-provider.types';

/**
 * Classe base abstrata para providers de upload
 */
export abstract class BaseUploadProvider implements IUploadProvider {
  abstract upload(file: any, folder?: string): Promise<UploadResult>;
  abstract delete(fileUrl: string): Promise<void>;
  abstract testConnection(): Promise<boolean>;

  /**
   * Valida o arquivo antes do upload
   */
  protected validateFile(file: any, allowedMimeTypes?: string[], maxSize?: number): void {
    if (maxSize && file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    if (allowedMimeTypes && allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }
  }

  /**
   * Gera nome de arquivo único
   */
  protected generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}-${randomString}.${extension}`;
  }
}
