import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/app-config.service';
import { SITE_BUILDS_QUEUE } from './builder.constants';
import { BuildProducer } from './queue/build.producer';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: new Redis(config.redisUrl, { maxRetriesPerRequest: null }),
      }),
    }),
    BullModule.registerQueue({ name: SITE_BUILDS_QUEUE }),
  ],
  providers: [BuildProducer],
  exports: [BullModule, BuildProducer],
})
export class BuilderQueueModule {}
