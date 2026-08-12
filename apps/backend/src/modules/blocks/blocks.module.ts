import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SitesModule } from '../sites/sites.module';
import { BlockRegistryService } from './block-registry.service';
import { BlocksController, ThemeBlocksController } from './blocks.controller';
import { SiteBlocksController } from './site-blocks.controller';
import { SiteBlocksService } from './site-blocks.service';

@Module({
  imports: [AuthModule, SitesModule],
  controllers: [BlocksController, ThemeBlocksController, SiteBlocksController],
  providers: [BlockRegistryService, SiteBlocksService],
  exports: [BlockRegistryService, SiteBlocksService],
})
export class BlocksModule {}
