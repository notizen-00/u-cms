ALTER TABLE "categories" ADD COLUMN "wp_id" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "wp_id" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "wp_guid" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "wp_id" integer;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "wp_guid" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "wp_id" integer;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "wp_guid" text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "wp_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_site_wp_id_unique" ON "categories" USING btree ("site_id","wp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_site_wp_id_unique" ON "media" USING btree ("site_id","wp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "news_site_wp_id_unique" ON "news" USING btree ("site_id","wp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_site_wp_id_unique" ON "pages" USING btree ("site_id","wp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_site_wp_id_unique" ON "tags" USING btree ("site_id","wp_id");