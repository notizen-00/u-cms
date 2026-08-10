import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/app-config.service';
import {
  WORDPRESS_IMPORT_QUEUE,
  WORDPRESS_IMPORT_QUEUE_CONFIG_KEY,
} from './wordpress-import.constants';
import { WordpressImportProducer } from './queue/wordpress-import.producer';

@Module({
  imports: [
    BullModule.forRootAsync(WORDPRESS_IMPORT_QUEUE_CONFIG_KEY, {
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: new Redis(config.redisUrl, { maxRetriesPerRequest: null }),
      }),
    }),
    BullModule.registerQueue({
      name: WORDPRESS_IMPORT_QUEUE,
      configKey: WORDPRESS_IMPORT_QUEUE_CONFIG_KEY,
    }),
  ],
  providers: [WordpressImportProducer],
  exports: [BullModule, WordpressImportProducer],
})
export class WordpressImportQueueModule {}
