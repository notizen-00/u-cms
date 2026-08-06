import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuilderQueueModule } from '../builder/builder-queue.module';
import { SitesModule } from '../sites/sites.module';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [AuthModule, SitesModule, BuilderQueueModule],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
