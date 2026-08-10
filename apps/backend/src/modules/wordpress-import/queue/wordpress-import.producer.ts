import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { DRIZZLE } from '../../../database/database.module';
import type { DrizzleDb } from '../../../database/database.types';
import { wordpressImports } from '../../../database/schema';
import { WORDPRESS_IMPORT_QUEUE } from '../wordpress-import.constants';

export interface WordpressImportJobData {
  importId: string;
  siteId: string;
  objectKey: string;
  triggeredBy: string;
}

@Injectable()
export class WordpressImportProducer {
  constructor(
    @InjectQueue(WORDPRESS_IMPORT_QUEUE)
    private readonly queue: Queue<WordpressImportJobData>,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async enqueue(
    siteId: string,
    objectKey: string,
    sourceFileName: string,
    triggeredBy: string,
  ) {
    const [importRow] = await this.db
      .insert(wordpressImports)
      .values({ siteId, triggeredBy, sourceFileName, status: 'queued' })
      .returning();

    await this.queue.add(
      'import',
      { importId: importRow.id, siteId, objectKey, triggeredBy },
      { removeOnComplete: 50, removeOnFail: 50 },
    );

    return importRow;
  }
}
