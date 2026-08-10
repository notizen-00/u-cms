# Unej CMS

Headless CMS platform untuk universitas, fakultas, instansi pemerintahan, dan organisasi — alternatif WordPress yang lebih aman, cepat, dan mudah dipelihara. Mendukung multi-website dari satu instance.

## Instalasi

Ada dua jalur. Pilih **satu** — keduanya menghasilkan instance yang sama.

### Jalur 1 — Docker (semuanya dalam container)

Butuh Docker Desktop / Docker Engine. Tidak perlu Node, pnpm, PostgreSQL, apa pun.

```sh
docker compose up -d
```

Selesai. Perintah itu membangun image, menjalankan Postgres + Redis + MinIO, menerapkan migrasi database, lalu menyalakan API, builder worker, dashboard, dan nginx dalam urutan yang benar.

| Layanan | URL |
| --- | --- |
| Dashboard admin | http://localhost:8081 |
| Website publik (hasil build) | http://localhost:8080 |
| API | http://localhost:3000 |
| MinIO console | http://localhost:9001 |

Semua port dan kredensial punya default yang berfungsi. Untuk mengubahnya, salin [`.env.example`](.env.example) ke `.env` — Compose membacanya otomatis.

```sh
docker compose logs -f     # ikuti log
docker compose down        # hentikan (data tetap tersimpan di volume)
docker compose down -v     # hentikan dan hapus semua data
```

> **Pindah dari `deploy/docker-compose.yml`.** File itu sekarang ada di root repo supaya `docker compose up -d` bisa dijalankan tanpa `cd`. Nama project ikut berubah (`deploy` → `unej-cms`), jadi volume lama Anda tidak terpakai lagi. Isinya masih ada sebagai `deploy_postgres_data` dkk; jalankan `docker volume ls` untuk melihatnya. Cara paling mudah: mulai dari nol dan ulangi wizard `/setup`.

### Jalur 2 — Native (aplikasi jalan langsung di mesin Anda)

Butuh **Node 22+**. pnpm dipasang otomatis lewat corepack kalau belum ada.

```sh
pnpm setup
```

Satu perintah, dan skrip itu mengerjakan semuanya:

1. Memeriksa Node dan pnpm.
2. Membuat `.env` dari tiap `.env.example` (file yang sudah ada tidak disentuh).
3. Memeriksa PostgreSQL, Redis, dan MinIO di port yang tertulis pada `apps/backend/.env`. **Yang sudah berjalan dipakai apa adanya** — Postgres bawaan Laragon, Homebrew, atau systemd tidak perlu diganti. Yang belum ada ditawarkan untuk dinyalakan lewat Docker.
4. `pnpm install`.
5. Membangun seluruh workspace, lalu memverifikasi output-nya benar-benar ada.
6. Menerapkan migrasi database.

Setelah itu:

```sh
pnpm dev        # build sekali, lalu API + worker + dashboard tanpa watcher
pnpm dev:watch  # mode pengembangan dengan hot reload
pnpm start      # mode produksi: tiga proses yang sama, dari hasil build
```

Dashboard ada di http://localhost:5173. Gunakan `pnpm dev:watch` saat mengembangkan UI agar perubahan dimuat otomatis oleh Vite.
Hasil publish builder tersedia secara native di `http://{site-slug}.localhost:8080/` selama `pnpm dev:watch` berjalan.

Flag yang tersedia kalau Anda perlu kendali lebih:

```sh
pnpm setup --yes            # tanpa pertanyaan interaktif (CI)
pnpm setup --skip-infra     # jangan periksa/menyalakan Postgres, Redis, MinIO
pnpm setup --skip-build     # jangan build (otomatis melewati migrasi juga)
pnpm setup --skip-migrate   # jangan jalankan migrasi
```

Kalau Anda hanya butuh layanan pendukungnya saja di Docker sementara aplikasinya native:

```sh
pnpm infra:up      # postgres + redis + minio
pnpm infra:down
```

### Setelah instalasi (kedua jalur)

Buka dashboard. Instance kosong akan mengarahkan Anda ke `/setup` untuk membuat super admin dan website pertama.

Kalau instance sudah bisa diakses publik sebelum langkah ini selesai, isi `SETUP_TOKEN` supaya `/setup` tidak bisa diklaim orang lain.

## Mengembangkan tema (live preview)

Untuk mengedit tema (mis. `themes/faculty`) tanpa perlu menyalakan database, Redis, MinIO, atau login — pakai server preview mandiri:

```sh
pnpm theme:dev faculty          # slug = nama folder di themes/, default "faculty"
pnpm theme:dev premium --port=4311
```

Skrip ini membangun tema sekali, lalu merender layout-nya (home, `/news/`, detail berita, halaman statis) dengan konten contoh lewat jalur render yang sama persis dengan `SvelteSiteRenderer`/`EtaSiteRenderer` di `apps/backend` — bedanya tanpa DB/queue/auth. Setiap kali file di `themes/<slug>/src` disimpan, tema di-build ulang dan browser me-reload otomatis (live reload lewat SSE). Cocok untuk kedua jenis tema (Svelte: `faculty`, `university`; Eta: `default`, `premium`) — jenisnya dideteksi otomatis.

Buka `http://localhost:4310/` (atau port yang dipakai) — daftar route yang tersedia dicetak saat server menyala.

### Menerapkan perubahan tema ke instance dev (native)

`pnpm theme:dev` di atas cuma preview mandiri — tidak dipakai oleh dashboard/API beneran. Kalau Anda mengedit tema (mis. `themes/premium`) dan mau perubahannya muncul di instance native yang sedang berjalan (`pnpm dev` / `pnpm dev:watch`), perlu tiga langkah, karena backend meng-*import* tema sebagai package (`@unej-cms/theme-premium` dari `dist/`, bukan baca `src/` langsung — lihat `apps/backend/src/modules/themes/theme-registry.ts`):

1. **Rebuild package tema.**
   - Dengan `pnpm dev:watch`: otomatis — setiap workspace di `themes/**` punya script `dev` (`tsup --watch`) yang jalan paralel dan langsung rebuild `dist/index.js` tiap file di `themes/<slug>/src` disimpan.
   - Dengan `pnpm dev` (tanpa watcher): manual — `pnpm --filter @unej-cms/theme-<slug> run build`, baru jalankan ulang `pnpm dev`.

2. **Restart proses `api` dan `worker`.** Keduanya meng-*import* modul tema sekali saat start dan meng-cache-nya di memory Node:
   - `dev:api` (`nest start --watch`) hanya mem-watch `apps/backend/src/**/*.ts` — perubahan pada `dist/` package tema di luar itu tidak terdeteksi.
   - `dev:worker` (`ts-node ... main-worker.ts`) malah tidak punya watcher sama sekali.

   Jadi setelah dist tema ter-*update*, restart manual tetap perlu:

   ```sh
   # paling gampang — restart semuanya
   # Ctrl+C pada terminal `pnpm dev:watch`, lalu jalankan lagi

   # atau restart api/worker saja, tanpa ganggu dashboard/theme-watcher lain
   pnpm --filter unej-cms run dev:api
   pnpm --filter unej-cms run dev:worker
   ```

3. **Trigger rebuild situs yang sudah pernah di-*publish*.** Output statis tiap situs tersimpan dari hasil build sebelumnya dan tidak otomatis re-render hanya karena API restart. Buka **Site → Theme** di dashboard lalu **Save** lagi (walau tidak ada yang diubah) — ini meng-antre-kan job build baru (`buildProducer.enqueue()` di `themes.service.ts`) yang me-render ulang situs pakai kode tema terbaru.

## Struktur monorepo

```
apps/
  backend/     NestJS API — auth, sites, news, pages, media, forms, static-site builder
  dashboard/   SvelteKit — admin dashboard (BFF ke backend)
  builder/     (reserved)
packages/sdk/  Kontrak SDK untuk plugin & tema (core, auth, content, media, events, plugin, storage, theme, ui)
plugins/       Plugin resmi (mis. page-builder, form-builder, auto-avif)
themes/        Tema resmi (default, premium, faculty, university)
scripts/       Installer native (`pnpm setup`) dan process runner (`pnpm start`)
deploy/        Konfigurasi nginx untuk stack Docker
```

## Stack

- **Backend**: NestJS, PostgreSQL (Drizzle ORM), Redis + BullMQ, MinIO (media storage)
- **Dashboard**: SvelteKit 5, Tailwind CSS v4
- **Tooling**: pnpm workspaces, TypeScript, tsup, Vitest

## Konfigurasi

Tiap jalur membaca file yang berbeda — ini sumber kebingungan yang paling sering:

| File | Dibaca oleh |
| --- | --- |
| [`.env`](.env.example) (root) | Docker Compose saja — port dan kredensial container |
| [`apps/backend/.env`](apps/backend/.env.example) | API dan builder worker saat jalan native |
| [`apps/dashboard/.env`](apps/dashboard/.env.example) | Dashboard saat jalan native |

Semuanya di-generate oleh `pnpm setup` dan tidak masuk git.

## Skrip root

```sh
pnpm setup       # installer native (idempoten — aman dijalankan ulang)
pnpm dev         # build sekali dan jalankan tanpa watcher
pnpm dev:watch   # semua app dalam mode watch + hot reload dashboard
pnpm theme:dev   # live-preview satu tema tanpa DB/Redis/MinIO (lihat "Mengembangkan tema")
pnpm start       # semua app dari hasil build
pnpm build       # build semua package/app
pnpm typecheck   # typecheck semua package/app
pnpm test        # jalankan test (vitest)
pnpm db:migrate  # terapkan migrasi database
pnpm infra:up    # nyalakan postgres + redis + minio via Docker
pnpm docker:up   # bangun dan jalankan seluruh stack dalam Docker
```

## Dokumentasi lanjutan

- [`apps/backend/docs/PRD.md`](apps/backend/docs/PRD.md) — product requirements
- [`apps/dashboard/README.md`](apps/dashboard/README.md) — detail arsitektur dashboard (BFF, sesi, setup wizard)
- [`apps/dashboard/PRD.md`](apps/dashboard/PRD.md) — product requirements dashboard
