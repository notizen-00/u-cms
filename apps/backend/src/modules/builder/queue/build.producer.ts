import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { DRIZZLE } from '../../../database/database.module';
import type { DrizzleDb } from '../../../database/database.types';
import { builds } from '../../../database/schema';
import { SITE_BUILDS_QUEUE } from '../builder.constants';

export interface SiteBuildJobData {
  buildId: string;
  siteId: string;
}

@Injectable()
export class BuildProducer {
  constructor(
    @InjectQueue(SITE_BUILDS_QUEUE)
    private readonly queue: Queue<SiteBuildJobData>,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async enqueue(siteId: string, triggeredBy?: string) {
    const [build] = await this.db
      .insert(builds)
      .values({ siteId, triggeredBy: triggeredBy ?? null, status: 'queued' })
      .returning();

    await this.queue.add(
      'build',
      { buildId: build.id, siteId },
      { removeOnComplete: 50, removeOnFail: 50 },
    );

    return build;
  }
}
