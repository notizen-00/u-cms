import { Global, Module } from '@nestjs/common';
import { Client } from 'minio';
import { AppConfigModule } from '../../../config/app-config.module';
import { AppConfigService } from '../../../config/app-config.service';

export const MINIO_CLIENT = Symbol('MINIO_CLIENT');

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: MINIO_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new Client({
          endPoint: config.minioEndpoint,
          port: config.minioPort,
          useSSL: config.minioUseSSL,
          accessKey: config.minioAccessKey,
          secretKey: config.minioSecretKey,
        }),
    },
  ],
  exports: [MINIO_CLIENT],
})
export class MinioClientModule {}
