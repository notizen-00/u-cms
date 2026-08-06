import { Module } from '@nestjs/common';
import { BuilderQueueModule } from './builder-queue.module';
import { AtomicDeployService } from './deploy/atomic-deploy.service';
import { BuildProcessor } from './queue/build.processor';
import { EtaSiteRenderer } from './render/eta-site-renderer';

@Module({
  imports: [BuilderQueueModule],
  providers: [BuildProcessor, EtaSiteRenderer, AtomicDeployService],
})
export class BuilderWorkerModule {}
