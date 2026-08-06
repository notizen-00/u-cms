# Unej CMS

Headless CMS platform untuk universitas, fakultas, instansi pemerintahan, dan organisasi — alternatif WordPress yang lebih aman, cepat, dan mudah dipelihara. Mendukung multi-website dari satu instance.

## Struktur monorepo

```
apps/
  backend/     NestJS API — auth, sites, news, pages, media, forms, static-site builder
  dashboard/   SvelteKit — admin dashboard (BFF ke backend)
  builder/     (reserved)
packages/sdk/  Kontrak SDK untuk plugin & tema (core, auth, content, media, events, plugin, storage, theme, ui)
plugins/       Plugin resmi (mis. form-builder)
themes/        Tema resmi (default, premium)
deploy/        docker-compose + konfigurasi nginx
```

## Stack

- **Backend**: NestJS, PostgreSQL (Drizzle ORM), Redis + BullMQ, MinIO (media storage)
- **Dashboard**: SvelteKit 5, Tailwind CSS v4
- **Tooling**: pnpm workspaces, TypeScript, tsup, Vitest

## Menjalankan secara lokal

Butuh PostgreSQL, Redis, dan MinIO. Cara tercepat pakai Docker Compose:

```sh
cd deploy
docker compose up -d postgres redis minio
```

Lalu instal dependensi dan jalankan semua app dalam mode dev:

```sh
pnpm install
pnpm dev
```

Setiap app punya `.env.example` sendiri (`apps/backend/.env.example`, `apps/dashboard/.env.example`) — salin ke `.env` dan sesuaikan sebelum menjalankan.

Saat pertama kali dijalankan, dashboard akan mengarahkan ke `/setup` untuk membuat super admin dan website pertama.

## Deploy dengan Docker Compose

```sh
cd deploy
docker compose up -d --build
```

Ini menjalankan seluruh stack (Postgres, Redis, MinIO, API, builder worker, dashboard, nginx). Lihat [`deploy/docker-compose.yml`](deploy/docker-compose.yml) untuk detail port dan environment variable.

## Skrip root

```sh
pnpm build       # build semua package/app
pnpm dev         # jalankan semua app dalam mode dev (paralel)
pnpm typecheck   # typecheck semua package/app
pnpm test        # jalankan test (vitest)
```

## Dokumentasi lanjutan

- [`apps/backend/docs/PRD.md`](apps/backend/docs/PRD.md) — product requirements
- [`apps/dashboard/README.md`](apps/dashboard/README.md) — detail arsitektur dashboard (BFF, sesi, setup wizard)
- [`apps/dashboard/PRD.md`](apps/dashboard/PRD.md) — product requirements dashboard
