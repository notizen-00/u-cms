import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SitesModule } from '../sites/sites.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaUploadPipelineService } from './media-upload-pipeline.service';
import { MinioClientModule } from './storage/minio-client.module';
import { MediaStorageService } from './storage/media-storage.service';

@Module({
  imports: [AuthModule, SitesModule, MinioClientModule],
  controllers: [MediaController],
  providers: [MediaService, MediaStorageService, MediaUploadPipelineService],
  exports: [MediaService],
})
export class MediaModule {}
