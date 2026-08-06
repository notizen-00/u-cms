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
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { createTagSchema, type CreateTagDto } from './dto/create-tag.dto';
import { mergeTagSchema, type MergeTagDto } from './dto/merge-tag.dto';
import { updateTagSchema, type UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@Controller('sites/:siteId/tags')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.tagsService.findAll(siteId);
  }

  @Get(':id')
  findOne(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.tagsService.findOne(siteId, id);
  }

  @Post()
  create(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(createTagSchema)) dto: CreateTagDto,
  ) {
    return this.tagsService.create(siteId, dto);
  }

  @Patch(':id')
  update(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTagSchema)) dto: UpdateTagDto,
  ) {
    return this.tagsService.update(siteId, id, dto);
  }

  @Delete(':id')
  remove(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.tagsService.remove(siteId, id);
  }

  @Post(':id/merge')
  merge(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(mergeTagSchema)) dto: MergeTagDto,
  ) {
    return this.tagsService.merge(siteId, id, dto);
  }
}
