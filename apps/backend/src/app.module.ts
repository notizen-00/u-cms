import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BuilderQueueModule } from './modules/builder/builder-queue.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { FormsModule } from './modules/forms/forms.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { MenusModule } from './modules/menus/menus.module';
import { NewsModule } from './modules/news/news.module';
import { PagesModule } from './modules/pages/pages.module';
import { PluginsModule } from './modules/plugins/plugins.module';
import { SetupModule } from './modules/setup/setup.module';
import { SitesModule } from './modules/sites/sites.module';
import { TagsModule } from './modules/tags/tags.module';
import { ThemesModule } from './modules/themes/themes.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    HealthModule,
    SetupModule,
    AuthModule,
    UsersModule,
    SitesModule,
    BuilderQueueModule,
    NewsModule,
    PagesModule,
    CategoriesModule,
    TagsModule,
    MediaModule,
    PluginsModule,
    ThemesModule,
    FormsModule,
    MenusModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
