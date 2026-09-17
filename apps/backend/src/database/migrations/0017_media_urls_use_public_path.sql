-- Existing uploads may contain an old absolute localhost/domain URL. Keep the
-- bucket and object key, but make the URL origin-relative so it works through
-- the configured public domain and its nginx /media proxy.
UPDATE "media"
SET "url" = regexp_replace("url", '^https?://[^/]+(/media/[^/]+/)', '\1')
WHERE "url" ~ '^https?://[^/]+/media/';
