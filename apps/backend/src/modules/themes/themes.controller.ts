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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import {
  ALLOWED_SCREENSHOT_MIME_TYPES,
  MAX_SCREENSHOT_SIZE_BYTES,
} from './theme-screenshot.constants';
import { ThemesService } from './themes.service';

@Controller('themes')
@UseGuards(SessionAuthGuard)
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  findAll() {
    return this.themesService.listCatalog();
  }

  // Screenshots are a platform-level concern (not tied to any one site), so
  // these two routes additionally require SuperAdminGuard on top of the
  // class-level SessionAuthGuard — same idiom as UsersController.
  @Post(':themeId/screenshot')
  @UseGuards(SuperAdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SCREENSHOT_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_SCREENSHOT_MIME_TYPES.includes(file.mimetype as never)) {
          callback(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadScreenshot(
    @Param('themeId') themeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.themesService.setScreenshot(themeId, file, user.id);
  }

  @Delete(':themeId/screenshot')
  @UseGuards(SuperAdminGuard)
  removeScreenshot(@Param('themeId') themeId: string) {
    return this.themesService.removeScreenshot(themeId);
  }
}
