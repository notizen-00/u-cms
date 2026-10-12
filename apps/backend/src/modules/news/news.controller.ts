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

import { createNewsSchema, type CreateNewsDto } from './dto/create-news.dto';
import { updateNewsSchema, type UpdateNewsDto } from './dto/update-news.dto';
import { NewsService } from './news.service';

@Controller('sites/:siteId/news')
@UseGuards(
  SessionAuthGuard,
  SiteMemberGuard,
  SitePermissionGuard,
)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @RequirePermissions('content:read')
  findAll(@Param('siteId') siteId: string) {
    return this.newsService.findAll(siteId);
  }

  @Get(':id')
  @RequirePermissions('content:read')
  findOne(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
  ) {
    return this.newsService.findOne(siteId, id);
  }

  @Post()
  @RequirePermissions('content:create')
  create(
    @Param('siteId') siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createNewsSchema))
    dto: CreateNewsDto,
  ) {
    return this.newsService.create(siteId, user, dto);
  }

  @Patch(':id')
  @RequirePermissions('content:update')
  update(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateNewsSchema))
    dto: UpdateNewsDto,
  ) {
    return this.newsService.update(siteId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('content:delete')
  remove(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
  ) {
    return this.newsService.remove(siteId, id);
  }

  @Post(':id/publish')
  @RequirePermissions('content:publish')
  publish(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
  ) {
    return this.newsService.publish(siteId, id);
  }
}