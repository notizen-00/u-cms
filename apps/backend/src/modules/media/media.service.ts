import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, not } from 'drizzle-orm';
import { imageSize } from 'image-size';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { media } from '../../database/schema';
import type { AuthenticatedUser } from '../auth/auth.service';
import type { ListMediaQueryDto } from './dto/list-media.query.dto';
import type { UpdateMediaDto } from './dto/update-media.dto';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './media.constants';
import { MediaUploadPipelineService } from './media-upload-pipeline.service';
import { MediaStorageService } from './storage/media-storage.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: MediaStorageService,
    private readonly pipeline: MediaUploadPipelineService,
  ) {}

  async findAll(siteId: string, query: ListMediaQueryDto) {
    const conditions = [eq(media.siteId, siteId)];

    if (query.type === 'image') {
      conditions.push(ilike(media.mimeType, 'image/%'));
    } else if (query.type === 'document') {
      conditions.push(not(ilike(media.mimeType, 'image/%')));
    }

    if (query.search) {
      conditions.push(ilike(media.originalName, `%${query.search}%`));
    }

    const where = and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(media)
        .where(where)
        .orderBy(desc(media.createdAt))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ total: count() }).from(media).where(where),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(siteId: string, id: string) {
    const [item] = await this.db
      .select()
      .from(media)
      .where(and(eq(media.siteId, siteId), eq(media.id, id)))
      .limit(1);

    if (!item) {
      throw new NotFoundException('Media not found');
    }

    return item;
  }

  async upload(
    siteId: string,
    uploader: AuthenticatedUser,
    file: Express.Multer.File,
    meta: UpdateMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as never)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES} bytes`,
      );
    }

    const processed = await this.pipeline.process(siteId, {
      data: file.buffer,
      originalName: file.originalname,
      storageName: file.originalname,
      mimeType: file.mimetype,
    });
    const processedBuffer = Buffer.from(processed.data);

    let width = processed.width;
    let height = processed.height;
    if (
      processed.mimeType.startsWith('image/') &&
      (width === undefined || height === undefined)
    ) {
      try {
        const dimensions = imageSize(processedBuffer);
        width = dimensions.width;
        height = dimensions.height;
      } catch {
        // Dimensions are a nice-to-have; ignore unreadable/corrupt images.
      }
    }

    const objectKey = this.storage.buildObjectKey(siteId, processed.storageName);
    await this.storage.upload(objectKey, processedBuffer, processed.mimeType);
    const url = this.storage.getPublicUrl(objectKey);

    try {
      const [created] = await this.db
        .insert(media)
        .values({
          siteId,
          uploadedById: uploader.id,
          objectKey,
          originalName: processed.originalName,
          mimeType: processed.mimeType,
          size: processedBuffer.byteLength,
          url,
          altText: meta.altText,
          caption: meta.caption,
          width,
          height,
        })
        .returning();
      if (!created) {
        throw new Error('Database did not return the created media row');
      }
      return created;
    } catch (error) {
      await this.storage.remove(objectKey).catch((cleanupError: unknown) => {
        this.logger.warn(
          `Could not remove orphaned media object "${objectKey}" after database failure: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        );
      });
      throw error;
    }
  }

  async update(siteId: string, id: string, dto: UpdateMediaDto) {
    await this.findOne(siteId, id);

    const [updated] = await this.db
      .update(media)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(media.siteId, siteId), eq(media.id, id)))
      .returning();

    return updated;
  }

  async remove(siteId: string, id: string) {
    const item = await this.findOne(siteId, id);

    await this.storage.remove(item.objectKey);
    await this.db
      .delete(media)
      .where(and(eq(media.siteId, siteId), eq(media.id, id)));

    return { success: true };
  }
}
