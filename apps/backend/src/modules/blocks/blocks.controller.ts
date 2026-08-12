import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { findThemeMetadata } from '../themes/theme-registry';
import { BlockRegistryService } from './block-registry.service';
import { toBlockDto, type BlockDto } from './block.dto';

/**
 * Block catalog, theme-independent (docs/theme_aware_prd.md §21). Site-scoped
 * lookups — "what may I actually insert on this site right now" — live on
 * SiteBlocksController instead, since those depend on the site's active theme
 * and plugins.
 */
@Controller('blocks')
@UseGuards(SessionAuthGuard)
export class BlocksController {
  constructor(private readonly registry: BlockRegistryService) {}

  @Get()
  findAll(): readonly BlockDto[] {
    return this.registry.listCore().map(toBlockDto);
  }

  @Get(':type')
  findOne(@Param('type') type: string): BlockDto {
    const block = this.registry.listCore().find(({ definition }) => String(definition.id) === type);
    if (!block) {
      throw new NotFoundException(`Block "${type}" not found`);
    }
    return toBlockDto(block);
  }
}

/** `GET /themes/:themeId/blocks` — everything that theme makes available (docs/theme_aware_prd.md §21). */
@Controller('themes/:themeId/blocks')
@UseGuards(SessionAuthGuard)
export class ThemeBlocksController {
  constructor(private readonly registry: BlockRegistryService) {}

  @Get()
  findAll(@Param('themeId') themeId: string): readonly BlockDto[] {
    // `resolveTheme` falls back to the default theme for an unknown id, which
    // would quietly answer for the wrong theme — reject explicitly instead.
    if (!findThemeMetadata(themeId)) {
      throw new NotFoundException(`Theme "${themeId}" not found`);
    }
    return this.registry.listForTheme(themeId).map(toBlockDto);
  }
}
