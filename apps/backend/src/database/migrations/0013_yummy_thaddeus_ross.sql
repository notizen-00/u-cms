ALTER TABLE "pages" ADD COLUMN "published_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- Backfill: a page already live (status='published') before this column
-- existed has no "last published snapshot" yet — without this, the very
-- next site build would render an empty homepage for any such page,
-- discarding content that was already on the live site. Draft-only pages
-- are untouched: they were never live, so there is nothing to snapshot.
UPDATE "pages" SET "published_blocks" = "blocks" WHERE "status" = 'published' AND jsonb_array_length("blocks") > 0;