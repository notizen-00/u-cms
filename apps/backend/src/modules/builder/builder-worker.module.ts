import { Module } from '@nestjs/common';
import { BuilderQueueModule } from './builder-queue.module';
import { AtomicDeployService } from './deploy/atomic-deploy.service';
import { BuildProcessor } from './queue/build.processor';
import { ContentRenderer } from './render/content-renderer';
import { EtaSiteRenderer } from './render/eta-site-renderer';
import { SvelteSiteRenderer } from './render/svelte-site-renderer';

@Module({
  imports: [BuilderQueueModule],
  providers: [BuildProcessor, ContentRenderer, EtaSiteRenderer, SvelteSiteRenderer, AtomicDeployService],
})
export class BuilderWorkerModule {}
