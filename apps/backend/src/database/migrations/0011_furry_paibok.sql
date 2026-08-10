CREATE TABLE "theme_overrides" (
	"theme_id" varchar(200) PRIMARY KEY NOT NULL,
	"screenshot_url" text,
	"screenshot_object_key" varchar(500),
	"updated_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "theme_overrides" ADD CONSTRAINT "theme_overrides_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;