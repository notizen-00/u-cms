import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { WordpressImportQueueModule } from './wordpress-import-queue.module';
import { WordpressImportProcessor } from './queue/wordpress-import.processor';

@Module({
  imports: [WordpressImportQueueModule, MediaModule],
  providers: [WordpressImportProcessor],
})
export class WordpressImportWorkerModule {}
