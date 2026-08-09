import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import { resolveThemeAssetsDir } from './theme-registry';

/**
 * Public, unauthenticated — a rendered site's <img>/CSS `url()` references
 * point here from a visitor's browser (a different origin than the
 * dashboard), same reasoning as PublicFormsController. Only ever serves
 * files that already ship inside a *registered* theme's own `assets/`
 * directory (see theme-registry.ts's INSTALLED_THEMES): an unknown themeId
 * 404s before any filesystem access happens, and the resolved file path is
 * verified to stay inside that directory — the same path-traversal class
 * scripts/static-preview.mjs's safeFile() guards against for published
 * sites.
 */
@Controller('theme-assets')
export class ThemeAssetsController {
  @Get(':themeId/*assetPath')
  serve(
    @Param('themeId') themeId: string,
    @Param('assetPath') assetPathSegments: string[],
    @Res() res: Response,
  ): void {
    const assetsDir = resolveThemeAssetsDir(themeId);
    if (!assetsDir || !existsSync(assetsDir)) {
      throw new NotFoundException('Theme not found');
    }
    if (!assetPathSegments || assetPathSegments.length === 0) {
      throw new NotFoundException('Asset not found');
    }

    const candidate = join(assetsDir, ...assetPathSegments);
    const rel = relative(assetsDir, candidate);
    if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new NotFoundException('Asset not found');
    }

    let isFile: boolean;
    try {
      isFile = statSync(candidate).isFile();
    } catch {
      throw new NotFoundException('Asset not found');
    }
    if (!isFile) {
      throw new NotFoundException('Asset not found');
    }

    res.sendFile(candidate, { maxAge: '1h' });
  }
}
