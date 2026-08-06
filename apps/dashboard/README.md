# Unej CMS — Admin Dashboard

SvelteKit admin app for the Unej CMS headless backend. See [`PRD.md`](./PRD.md) for the full product scope. Phase 1 currently includes the first-run setup wizard, authentication, sites, site membership actions, news, pages, users, and account sessions.

## Stack

- SvelteKit 5 (SSR, `adapter-node`)
- Tailwind CSS v4 + hand-built shadcn-svelte-style components (`bits-ui`, `tailwind-variants`) in `src/lib/components/ui`
- `marked` + `dompurify` for sanitized client-side Markdown preview
- Native `fetch` through server `load`/actions; the browser never calls the NestJS API directly

## Getting started

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Set `PUBLIC_API_URL` when the backend is not available at `http://localhost:3000`.

```env
PUBLIC_API_URL=http://localhost:3000
```

Available checks:

```sh
pnpm check
pnpm build
pnpm preview
```

## First-run setup

On every application request, `src/hooks.server.ts` checks `GET /setup/status` before checking authentication.

- When the backend returns `{ "needsSetup": true }`, every page redirects to `/setup`.
- `/setup` creates the first super administrator and the first website using one `POST /setup/init` request.
- When the backend uses `SETUP_TOKEN`, the operator enters the token from the API container log. The admin BFF sends it as `X-Setup-Token`.
- A successful setup response must set `unej_cms_session`. The SvelteKit server mirrors that cookie to the admin origin and redirects directly to `/`.
- Once setup is complete, `/setup` redirects to `/login` and cannot be run again.

The attached admin PRD describes a single transaction containing admin and site data but does not include the backend DTO source. The current request body is:

```json
{
  "admin": {
    "name": "Super Admin",
    "email": "admin@unej.ac.id",
    "password": "minimum-8-character"
  },
  "site": {
    "name": "Universitas Jember",
    "slug": "unej",
    "domain": "www.unej.ac.id"
  }
}
```

Reconcile `SetupInitInput` in `src/lib/types.ts` if the backend DTO uses different property names.

## BFF and session architecture

The admin app and the Unej CMS API can run on separate origins. The SvelteKit server mediates every API call:

- `src/hooks.server.ts` checks setup state, then calls `GET /auth/me` with the mirrored session cookie.
- `src/lib/server/api/auth.ts` reads the API `Set-Cookie` header after login and mirrors it into the admin app cookie jar.
- `src/lib/server/api/setup.ts` uses the same cookie mirroring after initial setup.
- Reads and writes live in `src/lib/server/api/*` and are called from server loaders and form actions.
- No token or password is stored in `localStorage`.

## Main routes

```text
/setup
/login
/
/sites
/sites/new
/sites/:siteId
/sites/:siteId/edit
/sites/:siteId/members
/sites/:siteId/news
/sites/:siteId/pages
/users
/account/sessions
```

## Backend contract notes

There is no OpenAPI specification yet, so DTOs in `src/lib/types.ts` are maintained manually.

Important current limitations:

- `GET /auth/me` does not expose the current user's role for each site; the UI can identify membership but cannot distinguish `site_admin`, `editor`, `reviewer`, and `author`.
- There is no `GET /sites/:id/members`; the admin can assign/remove members but cannot display a reliable member list.
- There is no build status/history endpoint; publishing only displays optimistic feedback.
- Self-service profile editing is not available because `PATCH /users/:id` is super-admin-only.

## Security hardening included

- Setup is guarded by backend state and optional `X-Setup-Token`.
- Session cookies remain httpOnly and same-site.
- Login and site-switch redirects reject protocol-relative and cross-origin targets.
- Logout clears the local session even when the backend API is unavailable.
- Markdown preview is sanitized before rendering.
