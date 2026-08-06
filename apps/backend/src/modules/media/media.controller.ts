import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import {
  listMediaQuerySchema,
  type ListMediaQueryDto,
} from './dto/list-media.query.dto';
import { updateMediaSchema, type UpdateMediaDto } from './dto/update-media.dto';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './media.constants';
import { MediaService } from './media.service';

@Controller('sites/:siteId/media')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  findAll(
    @Param('siteId') siteId: string,
    @Query(new ZodValidationPipe(listMediaQuerySchema))
    query: ListMediaQueryDto,
  ) {
    return this.mediaService.findAll(siteId, query);
  }

  @Get(':id')
  findOne(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.mediaService.findOne(siteId, id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype as never)) {
          callback(
            new BadRequestException(`Unsupported file type: ${file.mimetype}`),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(
    @Param('siteId') siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(updateMediaSchema)) dto: UpdateMediaDto,
  ) {
    return this.mediaService.upload(siteId, user, file, dto);
  }

  @Patch(':id')
  update(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMediaSchema)) dto: UpdateMediaDto,
  ) {
    return this.mediaService.update(siteId, id, dto);
  }

  @Delete(':id')
  remove(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.mediaService.remove(siteId, id);
  }
}
