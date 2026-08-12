import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { PreviewRendererService } from './preview-renderer.service';
import { PreviewTokenService } from './preview-token.service';

/**
 * Mints and revokes preview links for one page (docs/theme_aware_prd.md
 * §22-§23). Session-authenticated and site-scoped: only someone who may
 * already edit the site can create or revoke a link for it.
 */
@Controller('sites/:siteId/pages/:pageId/preview-token')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class PreviewTokenController {
  constructor(private readonly tokens: PreviewTokenService) {}

  @Post()
  async issue(@Param('siteId') siteId: string, @Param('pageId') pageId: string) {
    return { token: await this.tokens.issue(siteId, pageId) };
  }

  /** Revokes every outstanding preview token for this page (docs/theme_aware_prd.md §23's "dapat dicabut"). */
  @Post('revoke')
  @HttpCode(200)
  async revoke(@Param('siteId') siteId: string, @Param('pageId') pageId: string) {
    return { revoked: await this.tokens.revokeAllForPage(siteId, pageId) };
  }
}

/**
 * Serves the rendered preview document (docs/theme_aware_prd.md §22).
 *
 * Unguarded by session on purpose — it is authorised by the token alone, so
 * the iframe works regardless of cookie/SameSite behaviour across the
 * dashboard and API origins. The token is what limits access, and it grants
 * exactly one thing: viewing this one page for a few minutes.
 */
@Controller('preview/pages')
export class PreviewController {
  constructor(
    private readonly tokens: PreviewTokenService,
    private readonly renderer: PreviewRendererService,
  ) {}

  @Get(':pageId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  // A preview reflects unsaved-to-production draft content, so it must never
  // be cached anywhere — neither by the browser nor by a proxy in front.
  @Header('Cache-Control', 'no-store, max-age=0')
  // The preview is meant to be framed by the dashboard, but nothing else.
  @Header('X-Frame-Options', 'SAMEORIGIN')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  async render(
    @Param('pageId') pageId: string,
    @Query('token') token?: string,
  ): Promise<string> {
    const payload = token ? await this.tokens.verify(token, pageId) : null;
    if (!payload) {
      throw new ForbiddenException('Preview token tidak valid atau sudah kedaluwarsa.');
    }
    return this.renderer.renderPage(payload.siteId, pageId);
  }
}
