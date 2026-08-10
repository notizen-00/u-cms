import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { PluginsModule } from '../plugins/plugins.module';
import { SitesModule } from '../sites/sites.module';
import { WordpressImportController } from './wordpress-import.controller';
import { WordpressImportQueueModule } from './wordpress-import-queue.module';
import { WordpressImportService } from './wordpress-import.service';

@Module({
  imports: [AuthModule, SitesModule, PluginsModule, MediaModule, WordpressImportQueueModule],
  controllers: [WordpressImportController],
  providers: [WordpressImportService],
})
export class WordpressImportModule {}
