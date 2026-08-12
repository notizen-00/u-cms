import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app-config.module';
import { AuthModule } from '../auth/auth.module';
import { BlocksModule } from '../blocks/blocks.module';
import { SitesModule } from '../sites/sites.module';
import { ContentRenderer } from '../builder/render/content-renderer';
import { SvelteCompilerService } from '../builder/render/svelte-compiler.service';
import { PreviewRendererService } from './preview-renderer.service';
import { PreviewTokenService } from './preview-token.service';
import { PreviewController, PreviewTokenController } from './preview.controller';

@Module({
  imports: [AppConfigModule, AuthModule, SitesModule, BlocksModule],
  controllers: [PreviewController, PreviewTokenController],
  providers: [
    PreviewTokenService,
    PreviewRendererService,
    // Provided here rather than imported: these are stateless renderers, and
    // the API process needs its own instances since the build worker's live
    // in a separate module (and, in production, a separate process).
    SvelteCompilerService,
    ContentRenderer,
  ],
})
export class PreviewModule {}
