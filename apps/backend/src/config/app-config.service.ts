import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  get nodeEnv(): EnvConfig['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.configService.get('REDIS_URL', { infer: true });
  }

  get sessionCookieName(): string {
    return this.configService.get('SESSION_COOKIE_NAME', { infer: true });
  }

  get sessionTtlHours(): number {
    return this.configService.get('SESSION_TTL_HOURS', { infer: true });
  }

  get buildOutputDir(): string {
    return this.configService.get('BUILD_OUTPUT_DIR', { infer: true });
  }

  get setupToken(): string | undefined {
    return this.configService.get('SETUP_TOKEN', { infer: true });
  }

  get minioEndpoint(): string {
    return this.configService.get('MINIO_ENDPOINT', { infer: true });
  }

  get minioPort(): number {
    return this.configService.get('MINIO_PORT', { infer: true });
  }

  get minioAccessKey(): string {
    return this.configService.get('MINIO_ACCESS_KEY', { infer: true });
  }

  get minioSecretKey(): string {
    return this.configService.get('MINIO_SECRET_KEY', { infer: true });
  }

  get minioBucket(): string {
    return this.configService.get('MINIO_BUCKET', { infer: true });
  }

  get minioUseSSL(): boolean {
    return this.configService.get('MINIO_USE_SSL', { infer: true });
  }

  get minioPublicUrl(): string {
    const configured = this.configService.get('MINIO_PUBLIC_URL', {
      infer: true,
    });
    if (configured) {
      return configured;
    }
    const protocol = this.minioUseSSL ? 'https' : 'http';
    return `${protocol}://${this.minioEndpoint}:${this.minioPort}`;
  }

  get apiPublicUrl(): string {
    const configured = this.configService.get('API_PUBLIC_URL', {
      infer: true,
    });
    if (configured) {
      return configured;
    }
    return `http://localhost:${this.port}`;
  }
}
