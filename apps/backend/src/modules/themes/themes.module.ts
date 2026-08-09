import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuilderQueueModule } from '../builder/builder-queue.module';
import { SitesModule } from '../sites/sites.module';
import { SiteThemeController } from './site-theme.controller';
import { ThemeAssetsController } from './theme-assets.controller';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';

@Module({
  imports: [AuthModule, SitesModule, BuilderQueueModule],
  controllers: [ThemesController, SiteThemeController, ThemeAssetsController],
  providers: [ThemesService],
})
export class ThemesModule {}
