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
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { createNewsSchema, type CreateNewsDto } from './dto/create-news.dto';
import { updateNewsSchema, type UpdateNewsDto } from './dto/update-news.dto';
import { NewsService } from './news.service';

@Controller('sites/:siteId/news')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.newsService.findAll(siteId);
  }

  @Get(':id')
  findOne(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.newsService.findOne(siteId, id);
  }

  @Post()
  create(
    @Param('siteId') siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createNewsSchema)) dto: CreateNewsDto,
  ) {
    return this.newsService.create(siteId, user, dto);
  }

  @Patch(':id')
  update(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateNewsSchema)) dto: UpdateNewsDto,
  ) {
    return this.newsService.update(siteId, id, dto);
  }

  @Delete(':id')
  remove(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.newsService.remove(siteId, id);
  }

  @Post(':id/publish')
  publish(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.newsService.publish(siteId, id);
  }
}
