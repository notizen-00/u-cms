-- Convert existing installations deterministically before enforcing the
-- single-site invariant. The newest site becomes the public active site.
WITH chosen AS (
  SELECT id FROM sites ORDER BY created_at DESC, id DESC LIMIT 1
)
UPDATE sites
SET is_active = (sites.id = (SELECT id FROM chosen));

CREATE UNIQUE INDEX "sites_one_active_site_idx"
  ON "sites" ((is_active))
  WHERE is_active;
