import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { BuilderQueueModule } from './builder-queue.module';
import { AtomicDeployService } from './deploy/atomic-deploy.service';
import { BuildProcessor } from './queue/build.processor';
import { ContentRenderer } from './render/content-renderer';
import { EtaSiteRenderer } from './render/eta-site-renderer';
import { SvelteCompilerService } from './render/svelte-compiler.service';
import { SvelteSiteRenderer } from './render/svelte-site-renderer';

@Module({
  imports: [BuilderQueueModule, BlocksModule],
  providers: [
    BuildProcessor,
    ContentRenderer,
    EtaSiteRenderer,
    SvelteSiteRenderer,
    SvelteCompilerService,
    AtomicDeployService,
  ],
})
export class BuilderWorkerModule {}
