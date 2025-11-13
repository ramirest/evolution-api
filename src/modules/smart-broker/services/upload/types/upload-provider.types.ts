/**
 * Types e interfaces para providers de upload
 */

export enum UploadProvider {
  S3 = 's3',
  CLOUDINARY = 'cloudinary',
  GOOGLE_CLOUD = 'google_cloud',
  CLOUDFLARE = 'cloudflare',
}

/**
 * Configuração genérica de upload provider
 */
export interface UploadProviderConfig {
  provider: UploadProvider;
  credentials: S3Credentials | CloudinaryCredentials | GoogleCloudCredentials | CloudflareCredentials;
  options?: UploadOptions;
}

/**
 * Credenciais S3 (AWS ou compatíveis)
 */
export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // Para serviços S3-compatíveis (ex: DigitalOcean Spaces)
}

/**
 * Credenciais Cloudinary
 */
export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
}

/**
 * Credenciais Google Cloud Storage
 */
export interface GoogleCloudCredentials {
  projectId: string;
  keyFilename?: string;
  credentials?: any; // JSON da service account
  bucket: string;
}

/**
 * Credenciais Cloudflare Images
 */
export interface CloudflareCredentials {
  accountId: string;
  apiToken: string;
  accountHash?: string;
}

/**
 * Opções de upload
 */
export interface UploadOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  folder?: string;
  publicAccess?: boolean;
}

/**
 * Resultado de upload
 */
export interface UploadResult {
  url: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  provider: UploadProvider;
  metadata?: Record<string, any>;
}

/**
 * Interface base para todos os providers
 */
export interface IUploadProvider {
  upload(file: any, folder?: string): Promise<UploadResult>;
  delete(fileUrl: string): Promise<void>;
  testConnection(): Promise<boolean>;
}
