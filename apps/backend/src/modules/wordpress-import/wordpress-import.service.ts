import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { wordpressImports } from '../../database/schema';
import { MediaStorageService } from '../media/storage/media-storage.service';
import { WordpressImportProducer } from './queue/wordpress-import.producer';

@Injectable()
export class WordpressImportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: MediaStorageService,
    private readonly producer: WordpressImportProducer,
  ) {}

  async create(siteId: string, triggeredBy: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Stored under a throwaway key so the worker process (which never sees
    // the HTTP request that received this upload) can read it back from the
    // one storage both processes actually share — MinIO. The processor
    // removes this object once the import finishes, success or failed.
    const objectKey = this.storage.buildObjectKey(siteId, `_wordpress-import/${file.originalname}`);
    await this.storage.upload(objectKey, file.buffer, 'application/xml');

    return this.producer.enqueue(siteId, objectKey, file.originalname, triggeredBy);
  }

  listForSite(siteId: string) {
    return this.db
      .select()
      .from(wordpressImports)
      .where(eq(wordpressImports.siteId, siteId))
      .orderBy(desc(wordpressImports.createdAt));
  }

  async findOne(siteId: string, id: string) {
    const [importRow] = await this.db
      .select()
      .from(wordpressImports)
      .where(and(eq(wordpressImports.siteId, siteId), eq(wordpressImports.id, id)))
      .limit(1);
    if (!importRow) {
      throw new NotFoundException('Import not found');
    }
    return importRow;
  }
}
