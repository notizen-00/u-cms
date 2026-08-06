DROP TABLE "faq_items" CASCADE;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "theme_id" varchar(200) DEFAULT 'unej.theme-default' NOT NULL;