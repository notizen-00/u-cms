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
import { createPageSchema, type CreatePageDto } from './dto/create-page.dto';
import { updatePageSchema, type UpdatePageDto } from './dto/update-page.dto';
import { PagesService } from './pages.service';

@Controller('sites/:siteId/pages')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.pagesService.findAll(siteId);
  }

  @Get(':id')
  findOne(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.pagesService.findOne(siteId, id);
  }

  @Post()
  create(
    @Param('siteId') siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPageSchema)) dto: CreatePageDto,
  ) {
    return this.pagesService.create(siteId, user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePageSchema)) dto: UpdatePageDto,
  ) {
    return this.pagesService.update(siteId, id, dto);
  }

  @Delete(':id')
  remove(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.pagesService.remove(siteId, id);
  }

  @Post(':id/publish')
  publish(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.pagesService.publish(siteId, id);
  }

  /**
   * Publishes the Builder's draft `blocks` (docs/theme_aware_prd.md §16) —
   * separate from `publish` above, which only ever touched `status`/rebuild
   * timing and has no notion of a blocks snapshot to take.
   */
  @Post(':id/publish-blocks')
  publishBlocks(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.pagesService.publishBlocks(siteId, id);
  }
}
