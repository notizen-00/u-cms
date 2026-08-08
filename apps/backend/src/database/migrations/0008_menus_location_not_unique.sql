DROP INDEX "menus_site_location_unique";--> statement-breakpoint
CREATE INDEX "menus_site_location_idx" ON "menus" USING btree ("site_id","location_id");