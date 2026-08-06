import { pgEnum } from 'drizzle-orm/pg-core';

export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'archived',
  'trashed',
]);

export const buildStatusEnum = pgEnum('build_status', [
  'queued',
  'running',
  'success',
  'failed',
]);
