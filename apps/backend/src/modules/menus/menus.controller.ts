import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteAdminGuard } from '../sites/guards/site-admin.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { createMenuSchema, type CreateMenuDto } from './dto/create-menu.dto';
import { replaceMenuItemsSchema, type ReplaceMenuItemsDto } from './dto/replace-menu-items.dto';
import { updateMenuSchema, type UpdateMenuDto } from './dto/update-menu.dto';
import { MenusService } from './menus.service';

@Controller('sites/:siteId/menus')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.menusService.listForSite(siteId);
  }

  @Get(':menuId')
  findOne(@Param('siteId') siteId: string, @Param('menuId') menuId: string) {
    return this.menusService.getWithItems(siteId, menuId);
  }

  @Post()
  @UseGuards(SiteAdminGuard)
  create(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(createMenuSchema)) dto: CreateMenuDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.menusService.create(siteId, dto, user.id);
  }

  @Patch(':menuId')
  @UseGuards(SiteAdminGuard)
  update(
    @Param('siteId') siteId: string,
    @Param('menuId') menuId: string,
    @Body(new ZodValidationPipe(updateMenuSchema)) dto: UpdateMenuDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.menusService.update(siteId, menuId, dto, user.id);
  }

  @Delete(':menuId')
  @UseGuards(SiteAdminGuard)
  remove(
    @Param('siteId') siteId: string,
    @Param('menuId') menuId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.menusService.remove(siteId, menuId, user.id);
  }

  @Put(':menuId/items')
  @UseGuards(SiteAdminGuard)
  replaceItems(
    @Param('siteId') siteId: string,
    @Param('menuId') menuId: string,
    @Body(new ZodValidationPipe(replaceMenuItemsSchema)) dto: ReplaceMenuItemsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.menusService.replaceItems(siteId, menuId, dto.items, user.id);
  }
}
