import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { SitePermissionGuard } from '../../common/guards/site-permission.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';

import { createPageSchema, type CreatePageDto } from './dto/create-page.dto';
import { updatePageSchema, type UpdatePageDto } from './dto/update-page.dto';
import { PagesService } from './pages.service';

@Controller('sites/:siteId/pages')
@UseGuards(
  SessionAuthGuard,
  SiteMemberGuard,
  SitePermissionGuard,
)
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @RequirePermissions('content:read')
  findAll(@Param('siteId') siteId: string) {
    return this.pagesService.findAll(siteId);
  }

  @Get(':id')
  @RequirePermissions('content:read')
  findOne(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
  ) {
    return this.pagesService.findOne(siteId, id);
  }

  @Post()
  @RequirePermissions('content:create')
  create(
    @Param('siteId') siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPageSchema))
    dto: CreatePageDto,
  ) {
    return this.pagesService.create(siteId, user.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('content:update')
  update(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePageSchema))
    dto: UpdatePageDto,
  ) {
    return this.pagesService.update(siteId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('content:delete')
  remove(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
  ) {
    return this.pagesService.remove(siteId, id);
  }

  @Post(':id/publish')
  @RequirePermissions('content:publish')
  publish(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
  ) {
    return this.pagesService.publish(siteId, id);
  }

  @Post(':id/publish-blocks')
  @RequirePermissions('content:publish')
  publishBlocks(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
  ) {
    return this.pagesService.publishBlocks(siteId, id);
  }
}