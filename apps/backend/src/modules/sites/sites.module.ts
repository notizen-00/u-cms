import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuilderQueueModule } from '../builder/builder-queue.module';
import { SiteAdminGuard } from './guards/site-admin.guard';
import { SiteMemberGuard } from './guards/site-member.guard';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

@Module({
  imports: [AuthModule, BuilderQueueModule],
  controllers: [SitesController],
  providers: [SitesService, SiteAdminGuard, SiteMemberGuard],
  exports: [SitesService, SiteAdminGuard, SiteMemberGuard],
})
export class SitesModule {}
