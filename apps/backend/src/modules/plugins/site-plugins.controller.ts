import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteAdminGuard } from '../sites/guards/site-admin.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { PluginsService } from './plugins.service';

@Controller('sites/:siteId/plugins')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class SitePluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.pluginsService.listForSite(siteId);
  }

  @Post(':slug/activate')
  @UseGuards(SiteAdminGuard)
  activate(
    @Param('siteId') siteId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pluginsService.activate(siteId, slug, user.id);
  }

  @Post(':slug/deactivate')
  @UseGuards(SiteAdminGuard)
  deactivate(
    @Param('siteId') siteId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pluginsService.deactivate(siteId, slug, user.id);
  }

  @Delete(':slug')
  @UseGuards(SiteAdminGuard)
  uninstall(
    @Param('siteId') siteId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pluginsService.uninstall(siteId, slug, user.id);
  }
}
