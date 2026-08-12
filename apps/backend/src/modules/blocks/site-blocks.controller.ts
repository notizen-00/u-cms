import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { SiteBlocksService } from './site-blocks.service';

const checkCompatibilitySchema = z.object({
  themeId: z.string().min(1),
  types: z.array(z.string().min(1)).max(500),
});
type CheckCompatibilityDto = z.infer<typeof checkCompatibilitySchema>;

/**
 * What the Page Builder asks for when opening the block picker: the blocks
 * available on *this* site, given its active theme and plugins
 * (docs/theme_aware_prd.md §10).
 */
@Controller('sites/:siteId/blocks')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class SiteBlocksController {
  constructor(private readonly siteBlocks: SiteBlocksService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.siteBlocks.listForSite(siteId);
  }

  /**
   * POST rather than GET because the block-type list is page content that can
   * run to hundreds of entries — well past what belongs in a query string.
   * Read-only despite the verb: it only reports, and changes nothing.
   */
  @Post('compatibility')
  checkCompatibility(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(checkCompatibilitySchema)) dto: CheckCompatibilityDto,
  ) {
    return this.siteBlocks.checkCompatibility(siteId, dto.themeId, dto.types);
  }

  /**
   * Scans every page against a candidate theme (docs/theme_aware_prd.md §25)
   * — what the admin sees before confirming a theme switch. GET because it
   * takes no input beyond the two ids and only reports.
   */
  @Get('compatibility/:themeId')
  scanSite(@Param('siteId') siteId: string, @Param('themeId') themeId: string) {
    return this.siteBlocks.scanSite(siteId, themeId);
  }
}
