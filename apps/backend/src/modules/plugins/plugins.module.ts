import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuilderQueueModule } from '../builder/builder-queue.module';
import { SitesModule } from '../sites/sites.module';
import { PluginActiveGuard } from './guards/plugin-active.guard';
import { PluginsController } from './plugins.controller';
import { PluginsService } from './plugins.service';
import { SitePluginsController } from './site-plugins.controller';

@Module({
  imports: [AuthModule, SitesModule, BuilderQueueModule],
  controllers: [PluginsController, SitePluginsController],
  providers: [PluginsService, PluginActiveGuard],
  exports: [PluginActiveGuard],
})
export class PluginsModule {}
