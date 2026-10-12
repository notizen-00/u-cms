import { Module } from '@nestjs/common';
import { SitePermissionGuard } from '../../common/guards/site-permission.guard';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { BuilderQueueModule } from '../builder/builder-queue.module';

@Module({
  imports: [BuilderQueueModule],
  controllers: [NewsController],
  providers: [NewsService, SitePermissionGuard],
})
export class NewsModule {}