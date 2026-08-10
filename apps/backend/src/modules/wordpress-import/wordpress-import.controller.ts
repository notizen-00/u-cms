import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PLUGIN_ID } from '@unej-cms/plugin-wordpress-import';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RequirePlugin } from '../plugins/decorators/require-plugin.decorator';
import { PluginActiveGuard } from '../plugins/guards/plugin-active.guard';
import { SiteAdminGuard } from '../sites/guards/site-admin.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { WXR_MAX_FILE_SIZE_BYTES } from './wordpress-import.constants';
import { WordpressImportService } from './wordpress-import.service';

@Controller('sites/:siteId/wordpress-import')
@UseGuards(SessionAuthGuard, SiteMemberGuard, PluginActiveGuard)
@RequirePlugin(PLUGIN_ID)
export class WordpressImportController {
  constructor(private readonly wordpressImportService: WordpressImportService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.wordpressImportService.listForSite(siteId);
  }

  @Get(':id')
  findOne(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.wordpressImportService.findOne(siteId, id);
  }

  @Post()
  @UseGuards(SiteAdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: WXR_MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!/\.xml$/i.test(file.originalname)) {
          callback(new BadRequestException('Expected a WordPress WXR .xml export file'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  create(
    @Param('siteId') siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.wordpressImportService.create(siteId, user.id, file);
  }

  @Delete(':id')
  @UseGuards(SiteAdminGuard)
  remove(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.wordpressImportService.remove(siteId, id);
  }
}
