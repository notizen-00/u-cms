import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteAdminGuard } from '../sites/guards/site-admin.guard';
import { setSiteThemeSchema, type SetSiteThemeDto } from './dto/set-site-theme.dto';
import { ThemesService } from './themes.service';

@Controller('sites/:siteId/theme')
@UseGuards(SessionAuthGuard, SiteAdminGuard)
export class SiteThemeController {
  constructor(private readonly themesService: ThemesService) {}

  @Patch()
  setTheme(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(setSiteThemeSchema)) dto: SetSiteThemeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.themesService.setForSite(siteId, dto.themeId, user.id);
  }

  @Get('settings')
  getSettings(@Param('siteId') siteId: string) {
    return this.themesService.getSettingsForSite(siteId);
  }

  @Patch('settings')
  updateSettings(
    @Param('siteId') siteId: string,
    @Body() values: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.themesService.updateSettingsForSite(siteId, values, user.id);
  }
}
