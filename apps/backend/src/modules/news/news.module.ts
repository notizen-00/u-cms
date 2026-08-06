import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuilderQueueModule } from '../builder/builder-queue.module';
import { SitesModule } from '../sites/sites.module';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [AuthModule, SitesModule, BuilderQueueModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
