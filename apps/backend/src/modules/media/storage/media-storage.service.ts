import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Client } from 'minio';
import { extname } from 'path';
import { AppConfigService } from '../../../config/app-config.service';
import { MINIO_CLIENT } from './minio-client.module';

@Injectable()
export class MediaStorageService implements OnModuleInit {
  private readonly logger = new Logger(MediaStorageService.name);

  constructor(
    @Inject(MINIO_CLIENT) private readonly client: Client,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit() {
    const bucket = this.config.minioBucket;

    const exists = await this.client.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.client
        .makeBucket(bucket)
        .catch((error: Error) =>
          this.logger.warn(`Could not create bucket "${bucket}": ${error.message}`),
        );
    }

    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    });
    await this.client
      .setBucketPolicy(bucket, policy)
      .catch((error: Error) =>
        this.logger.warn(
          `Could not set public-read policy on bucket "${bucket}": ${error.message}`,
        ),
      );
  }

  buildObjectKey(siteId: string, originalName: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ext = extname(originalName).toLowerCase();
    const slug = originalName
      .slice(0, originalName.length - ext.length)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return `sites/${siteId}/${year}/${month}/${randomUUID()}${slug ? `-${slug}` : ''}${ext}`;
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.putObject(
      this.config.minioBucket,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType },
    );
  }

  async remove(key: string): Promise<void> {
    await this.client.removeObject(this.config.minioBucket, key);
  }

  getPublicUrl(key: string): string {
    return `${this.config.minioPublicUrl}/${this.config.minioBucket}/${key}`;
  }
}
