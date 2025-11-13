import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { BaseUploadProvider } from './base.provider';
import { S3Credentials, UploadResult, UploadProvider } from '../types/upload-provider.types';

/**
 * Provider de upload para AWS S3 (ou compatíveis)
 */
export class S3UploadProvider extends BaseUploadProvider {
  private client: S3Client;
  private bucket: string;

  constructor(
    private credentials: S3Credentials,
    private options?: { maxSizeBytes?: number; allowedMimeTypes?: string[] },
  ) {
    super();
    this.bucket = credentials.bucket;
    this.client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      ...(credentials.endpoint && { endpoint: credentials.endpoint }),
    });
  }

  async upload(file: any, folder?: string): Promise<UploadResult> {
    this.validateFile(file, this.options?.allowedMimeTypes, this.options?.maxSizeBytes);

    const fileName = this.generateFileName(file.originalname);
    const key = folder ? `${folder}/${fileName}` : fileName;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await this.client.send(command);

    const url = this.credentials.endpoint
      ? `${this.credentials.endpoint}/${this.bucket}/${key}`
      : `https://${this.bucket}.s3.${this.credentials.region}.amazonaws.com/${key}`;

    return {
      url,
      publicUrl: url,
      fileName: key,
      mimeType: file.mimetype,
      size: file.size,
      provider: UploadProvider.S3,
      metadata: {
        bucket: this.bucket,
        region: this.credentials.region,
      },
    };
  }

  async delete(fileUrl: string): Promise<void> {
    // Extrair key da URL
    const key = fileUrl.split('/').slice(-1)[0];

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async testConnection(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucket });
      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('S3 connection test failed:', error);
      return false;
    }
  }
}
