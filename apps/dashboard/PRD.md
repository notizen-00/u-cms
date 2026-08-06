# Product Requirements Document (PRD)

# Unej CMS — Admin Dashboard

### SvelteKit Admin Application

Version: 1.0 MVP

Status: Draft

Companion document to `docs/PRD.md` (platform-wide PRD). This document scopes the **admin dashboard only** — the SvelteKit application editors, site admins, and super admins use to manage content. It does not cover the public website renderer or the NestJS backend, except where the admin app depends directly on backend behavior.

---

# 1. Overview

## Vision

Dashboard admin yang terasa familiar seperti WordPress wp-admin, tapi dibangun di atas arsitektur headless modern: cepat (SvelteKit, SSR), aman (session cookie httpOnly, tidak ada eksekusi kode arbitrer), dan mendukung multi-website dari satu instalasi.

Admin app **tidak pernah menyentuh Docker, database, atau file server** secara langsung — semua operasi lewat REST API yang sudah berjalan di `apps/api` (lihat `docs/PRD.md` §14). Publish artikel memicu build lewat queue di backend; admin app hanya menampilkan hasilnya.

---

# 2. Background

Repo backend (`unej-cms`, NestJS) sudah mengimplementasikan **Phase 1** dari PRD utama: autentikasi berbasis session, multi-site, manajemen user, News & Pages dengan workflow Draft→Publish, build queue (BullMQ), dan static site renderer dengan atomic deploy. Semua ini sudah diverifikasi jalan end-to-end lewat `curl` dan Docker Compose — tapi belum ada antarmuka manusia untuk memakainya. Editor saat ini harus memanggil REST API secara langsung.

Admin app ini mengisi gap tersebut: **UI di atas API yang sudah ada**, bukan spekulasi API yang belum dibangun. Fitur yang di-scope Phase 1 di sini dibatasi ketat pada endpoint yang benar-benar sudah ada di backend hari ini (lihat §12 untuk daftar lengkap).

---

# 3. Goals

## Business Goals

- Editor bisa mengelola website institusi tanpa menyentuh terminal/API client.
- Mengurangi friksi migrasi dari WordPress — pengalaman harus terasa familiar.
- Satu dashboard untuk mengelola banyak website (multi-tenant) dari satu login.

## Technical Goals

- SSR-first (SvelteKit) untuk kecepatan awal muat dan agar session cookie httpOnly bekerja natural tanpa expose token ke client JS.
- Tidak menyimpan state sensitif (token, password) di localStorage — session sepenuhnya dikelola lewat cookie httpOnly yang sudah diset backend.
- Semua form tervalidasi client-side (UX) **dan** percaya validasi server-side (Zod di backend) sebagai sumber kebenaran.
- Desain komponen reusable dari awal (shadcn-svelte) supaya menu builder, block editor, dsb. di Phase 2 tidak perlu bongkar ulang.

---

# 4. Non-Goals (Phase 1)

Tidak termasuk di rilis pertama admin app ini, karena backend-nya juga belum ada:

- Block editor (TipTap) — Phase 1 memakai **plain markdown textarea + preview**, karena backend menyimpan `bodyMarkdown` sebagai string, bukan block JSON.
- Media Library (upload gambar/PDF) — backend belum punya modul media/MinIO integration.
- Menu Builder, Widget, Theme picker, Official Plugin management — belum ada tabel/endpoint di backend.
- Categories & Tags — belum ada di schema backend.
- Revision history, Audit Log viewer — backend mencatat `login_history` tapi belum ada audit log umum atau revisions.
- SEO fields (meta title/description/OG/sitemap editor) — belum ada kolom SEO di schema `news`/`pages`.
- Full-text search, Notification center.
- 2FA UI — kolom `twoFactorEnabled`/`twoFactorSecret` sudah ada di schema user tapi belum diimplementasikan di backend (stub).
- Self-service profile edit — endpoint `PATCH /users/:id` saat ini **super_admin-only**, user lain tidak bisa edit profil sendiri lewat API (lihat §13, gap #2).
- Build history / status viewer — tidak ada endpoint `GET /sites/:id/builds` di backend saat ini (lihat §13, gap #1).

Semua item ini match dengan roadmap V2/V3 di `docs/PRD.md` §20 — bukan dihilangkan, hanya belum ada API-nya.

---

# 5. Target Users

Mengacu ke `docs/PRD.md` §5. Ringkasan relevansi untuk admin app di Phase 1:

| Role                       | Akses di backend saat ini                           | Relevansi UI Phase 1                                                                              |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Super Administrator        | `isSuperAdmin=true`, bypass semua guard             | Full akses: Sites, Users, semua konten semua site                                                 |
| Site Administrator         | role `site_admin` di `user_site_roles` untuk 1 site | Kelola setting site miliknya, kelola konten site miliknya                                         |
| Editor / Reviewer / Author | role terdaftar di `user_site_roles`                 | Kelola konten site miliknya (**backend belum membedakan hak akses ketiganya** — lihat §13 gap #3) |

Tidak ada role "Media Manager" / "SEO Manager" terpisah di backend saat ini (role fixed: `super_admin`, `site_admin`, `editor`, `reviewer`, `author`).

---

# 6. Product Architecture

```text
Browser
   │
SvelteKit Admin (SSR + client hydration)
   │  fetch, credentials: 'include'
REST API — NestJS (localhost:3000 dev / api service di Docker)
   │
PostgreSQL + Redis + BullMQ (builder worker)
```

Admin app adalah **klien murni** dari REST API yang sudah didokumentasikan di §12. Tidak ada logic bisnis yang didup di sisi admin app — validasi, otorisasi, dan state transisi konten semuanya sudah ditegakkan backend; admin app hanya mengirim request dan menampilkan hasil/error.

---

# 7. Technology

Mengikuti `docs/PRD.md` §17:

- **SvelteKit** (SSR mode, adapter-node untuk Docker)
- **Tailwind CSS**
- **shadcn-svelte** untuk komponen dasar (form, table, dialog, dropdown)
- Markdown editor Phase 1: textarea + live preview (library ringan, mis. `marked` atau reuse `markdown-it` di client — **belum** TipTap, itu Phase 2 begitu block editor di-scope)
- HTTP client: native `fetch` lewat SvelteKit `load`/form actions, bukan library terpisah (axios dll. tidak perlu)
- Auth check: `hooks.server.ts` membaca cookie session, panggil `GET /auth/me` di server-side, redirect ke `/login` kalau 401

### Deployment

Admin app adalah service Docker terpisah (`admin`) dari repo backend, di-build dengan `adapter-node`, di-reverse-proxy terpisah dari `nginx` yang melayani static site publik (§14 PRD utama). Detail Docker Compose untuk admin app **di luar scope dokumen ini** — akan ditambahkan saat repo admin dibuat.

---

# 8. Information Architecture

```
/setup                           — wizard instalasi awal (hanya aktif kalau belum ada user sama sekali)
/login                          — form login
/                                — dashboard (ringkasan, redirect per role)
/sites                          — daftar site (super_admin only)
/sites/new                      — form buat site (super_admin only)
/sites/:siteId                  — detail/setting site
/sites/:siteId/edit             — form edit site (super_admin atau site_admin site tsb.)
/sites/:siteId/members          — daftar member + assign role (super_admin only, Phase 1)
/sites/:siteId/news             — daftar berita site
/sites/:siteId/news/new         — form berita baru
/sites/:siteId/news/:newsId     — edit berita
/sites/:siteId/pages            — daftar halaman site
/sites/:siteId/pages/new        — form halaman baru
/sites/:siteId/pages/:pageId    — edit halaman
/users                          — daftar user (super_admin only)
/users/new                      — form buat user (super_admin only)
/users/:userId/edit             — form edit user (super_admin only)
/account/sessions               — daftar sesi aktif milik user login, tombol revoke
```

Site switcher (dropdown di header) muncul kalau user punya akses ke >1 site; kalau cuma 1 site, langsung masuk konteks site itu setelah login (skip `/sites` picker).

---

# 9. Core Features (Phase 1)

## 9.0 Initial Setup Wizard (First-Run)

Terinspirasi langsung dari WordPress **"5-minute install"** — instalasi Docker Compose selesai `up`, buka domain, langsung disambut wizard, bukan halaman login kosong atau instruksi "jalankan `pnpm db:seed` manual". Ini pengganti UX untuk apa yang sekarang cuma bisa dilakukan lewat CLI (`pnpm db:seed`, lihat `docs/PRD.md` §M2 backend).

### Trigger & guard

- `hooks.server.ts` pada **setiap** request memanggil `GET /setup/status` (endpoint publik baru, lihat gap #8 di §13). Response `{ needsSetup: true }` kalau tabel `users` kosong.
- Kalau `needsSetup === true` dan path bukan `/setup`, redirect paksa ke `/setup` — termasuk kalau user coba akses `/login` langsung.
- Kalau `needsSetup === false` dan path adalah `/setup`, redirect ke `/login` — wizard tidak boleh bisa dijalankan ulang setelah selesai (mencegah super admin baru dibuat diam-diam oleh siapa pun yang menemukan URL-nya).

### Langkah-langkah

1. **Welcome** — logo/branding Unej CMS, penjelasan singkat 1 paragraf, tombol "Mulai".
2. **Buat Akun Super Admin** — name, email, password, confirm password (validasi client: password match, min 8 char — mirror aturan backend).
3. **Buat Website Pertama** — site name, slug (auto-generate dari name, editable), domain (opsional). Tidak bisa di-skip, sama seperti WordPress selalu membuat satu situs saat instalasi — situs tambahan dibuat belakangan lewat `/sites/new` (§9.3).
4. **Selesai** — ringkasan (email admin, nama situs, slug), tombol "Masuk ke Dashboard". Wizard langsung men-submit ketiga langkah sebagai **satu** request di langkah terakhir (bukan tiga request terpisah — supaya tidak ada state "setengah ter-setup" kalau user menutup tab di tengah jalan).

### Perilaku setelah submit

`POST /setup/init` (lihat kontrak di §13 gap #8) membuat super admin + situs pertama + assignment role `super_admin` global, lalu **langsung set session cookie** (auto-login) — sama seperti WordPress yang langsung login-kan user setelah instalasi kelar, tidak menyuruh login manual lagi. Redirect ke `/` (dashboard).

### Mitigasi keamanan

Beda dengan WordPress (yang rawan "installer race" — siapa pun yang sampai duluan ke `install.php` di jaringan publik bisa mengklaim jadi admin), endpoint `/setup/*` di sini sebaiknya juga menerima header opsional `X-Setup-Token` yang dicocokkan ke env var `SETUP_TOKEN` (di-generate random saat `docker compose up` pertama, dicetak ke log container `api`). Kalau `SETUP_TOKEN` diset di backend, wizard di admin app minta token itu diketik di langkah 1 sebelum lanjut. Kalau tidak diset, endpoint tetap bisa diakses siapa pun yang lebih dulu sampai (setara risiko WordPress) — jadi ini **direkomendasikan**, bukan wajib, dan didokumentasikan jelas ke operator saat deploy.

## 9.1 Authentication & Session

- **Login** — form email+password → `POST /auth/login`. Rate-limited backend (5/menit/IP); tampilkan pesan generik "Email atau password salah" (jangan bocorkan mana yang salah — sudah konsisten dengan backend yang juga generik).
- **Logout** — `POST /auth/logout`, redirect ke `/login`.
- **Session guard** — setiap route di bawah layout admin cek sesi lewat `hooks.server.ts` (panggil `GET /auth/me` server-side dengan cookie forwarded). 401 → redirect `/login?redirect=<path>`.
- **Active sessions** — halaman `/account/sessions` list dari `GET /auth/sessions` (userAgent, IP, createdAt, expiresAt), tombol "Revoke" per baris → `DELETE /auth/sessions/:id`. Berguna untuk user cek "device mana saja yang login."
- Cookie session (`unej_cms_session`) di-set backend sebagai httpOnly+SameSite=Lax; admin app tidak pernah membaca/menyimpan token ini secara manual — browser yang handle otomatis via `credentials: 'include'`.

## 9.2 Dashboard

Ringkasan sederhana per konteks:

- Super admin: jumlah site, jumlah user, shortcut ke Sites/Users.
- Site admin/editor: daftar draft terbaru miliknya + jumlah published di site aktif.

Tidak ada data agregat baru dari backend untuk ini — dashboard menyusun ulang data dari `GET /sites`, `GET /sites/:id/news`, `GET /sites/:id/pages` yang sudah ada.

## 9.3 Site Management

- **List** (`GET /sites`) — backend otomatis filter: super_admin lihat semua, user lain hanya lihat site yang dia punya role di dalamnya. UI tidak perlu filter tambahan.
- **Create** (`POST /sites`, super_admin only) — form: slug (lowercase-dash, validasi client mirror regex backend `^[a-z0-9-]+$`), name, domain (opsional), logoUrl, faviconUrl.
- **Detail/Read** (`GET /sites/:id`) — 403 dari backend kalau user tidak punya akses; tampilkan halaman "Access Denied" bukan redirect diam-diam.
- **Update** (`PATCH /sites/:id`) — form sama seperti create, semua field opsional (partial update). Guard: super_admin ATAU site_admin site tsb.
- **Delete** (`DELETE /sites/:id`, super_admin only) — konfirmasi dialog wajib (destruktif, cascade hapus semua news/pages/builds site tsb. di DB).

## 9.4 Site Membership (Role Assignment)

- `POST /sites/:id/members` — assign role (`site_admin` | `editor` | `reviewer` | `author`) ke user by `userId`. **Super_admin only di Phase 1** (backend belum izinkan site_admin delegasikan member management-nya sendiri — lihat §13 gap #4).
- `DELETE /sites/:id/members/:userId` — cabut semua role user tsb. di site itu.
- UI perlu dropdown pilih user — **tidak ada endpoint search user by email**, jadi Phase 1 harus fetch `GET /users` penuh (super_admin only, jadi ini aman) dan filter di client.

## 9.5 User Management

- Full CRUD, **super_admin only** untuk semuanya (`GET/POST/PATCH/DELETE /users`).
- Create: email, password (min 8 char), name, isSuperAdmin (checkbox, default false).
- Update: name/password/isSuperAdmin, semua opsional.
- Response tidak pernah include `passwordHash` (sudah di-strip backend) — aman ditampilkan langsung di tabel.
- Tidak ada assign-role-di-sini; role assignment dilakukan dari halaman site (§9.4), bukan dari halaman user.

## 9.6 News Management

Route: `/sites/:siteId/news/*`. Backend: `sites/:siteId/news`.

- **List** — tabel: title, status (badge warna per status), author, updatedAt. Filter status di client (backend belum expose query filter).
- **Create** — title, slug (auto-generate dari title, editable), excerpt (≤500 char), bodyMarkdown (textarea + preview pane), featuredImageUrl (input URL manual — tidak ada upload, lihat Non-Goals).
- **Edit** — form sama, plus dropdown status manual (draft/in_review/approved/scheduled/archived/trashed — **semua transisi via PATCH generik**, backend tidak validasi urutan state machine, jadi UI-lah yang harus membatasi pilihan yang masuk akal per status saat ini).
- **Publish** — tombol terpisah dari save, memanggil `POST /sites/:siteId/news/:id/publish` (bukan PATCH status=published — endpoint ini yang memicu build job di backend). Tampilkan toast "Dipublikasikan, situs sedang di-build" — **tidak ada cara mengecek kapan build selesai di Phase 1** (lihat §13 gap #1), jadi toast cukup sampai situ, tidak ada progress bar real.
- **Delete** — hard delete (`DELETE`), konfirmasi dialog wajib. Tidak ada trash/restore UX bertingkat di Phase 1 meskipun status `trashed` ada di enum — men-set status ke `trashed` lewat PATCH sama efeknya dengan "soft delete", tapi tombol Delete di UI Phase 1 langsung hard-delete untuk kesederhanaan.

## 9.7 Pages Management

Route: `/sites/:siteId/pages/*`. Sama seperti News, dengan perbedaan field:

- Field: title, slug, bodyMarkdown, **parentId** (dropdown pilih page lain di site yang sama, untuk parent/child hierarchy), **isHomepage** (checkbox — hanya satu page per site yang boleh jadi homepage, **backend tidak menegakkan constraint ini**, jadi UI harus warning kalau user centang isHomepage padahal sudah ada page lain dengan isHomepage=true di site itu), **order** (angka, untuk urutan di navigasi).
- Tidak ada field excerpt/featuredImage (khusus News).
- Publish sama seperti News: `POST /sites/:siteId/pages/:id/publish`.

## 9.8 Publish & Build Feedback (batasan yang harus dikomunikasikan ke user)

Karena tidak ada endpoint status build (§13 gap #1), UX publish di Phase 1 jujur terbatas:

1. User klik "Publish".
2. Optimistic UI: badge status berubah ke "Published" segera setelah response 200 dari `POST .../publish` (bukan menunggu build selesai — API call ini cuma update DB + enqueue job, build async di worker terpisah).
3. Toast: "Published. Situs akan diperbarui dalam beberapa detik."
4. **Tidak ada** indikator sukses/gagal build di UI Phase 1. Kalau build gagal di backend, admin tidak tahu dari UI — hanya kelihatan di `builds` table lewat query manual atau log worker.

Ini limitasi yang harus didokumentasikan jelas ke stakeholder, bukan disembunyikan — dan jadi justifikasi kuat untuk menambah `GET /sites/:id/builds` di backend secepatnya (lihat §13).

---

# 10. Permissions Matrix (Phase 1, sesuai penegakan backend aktual)

| Aksi                      | super_admin | site_admin (site sendiri) | editor/reviewer/author (site sendiri) | Tanpa role di site |
| ------------------------- | ----------- | ------------------------- | ------------------------------------- | ------------------ |
| Lihat daftar sites        | Semua       | Site miliknya saja        | Site miliknya saja                    | —                  |
| Create/Delete site        | ✅          | ❌                        | ❌                                    | ❌                 |
| Update site               | ✅          | ✅                        | ❌                                    | ❌                 |
| Assign/remove site member | ✅          | ❌ (gap #4)               | ❌                                    | ❌                 |
| CRUD Users                | ✅          | ❌                        | ❌                                    | ❌                 |
| CRUD News/Pages di site   | ✅          | ✅                        | ✅ (tidak dibedakan, gap #3)          | ❌ (403)           |
| Publish News/Pages        | ✅          | ✅                        | ✅ (tidak dibedakan, gap #3)          | ❌ (403)           |

UI harus **menyembunyikan** aksi yang pasti akan 403 (misal tombol "Delete Site" untuk site_admin) daripada membiarkan user klik lalu dapat error — tapi backend tetap sumber kebenaran; UI hiding bukan pengganti otorisasi.

---

# 11. API Integration Reference

Base URL: `env.PUBLIC_API_URL` (dev: `http://localhost:3000`, Docker: nama service `api`).
Semua request `credentials: 'include'` supaya cookie session terkirim. Semua body JSON, `Content-Type: application/json`.

| Method                | Path                                               | Auth                           | Catatan                         |
| --------------------- | -------------------------------------------------- | ------------------------------ | ------------------------------- |
| POST                  | `/auth/login`                                      | Public                         | Rate-limited 5/min              |
| POST                  | `/auth/logout`                                     | Session                        | Clears cookie                   |
| GET                   | `/auth/me`                                         | Session                        | Dipakai `hooks.server.ts`       |
| GET                   | `/auth/sessions`                                   | Session                        | Punya sendiri saja              |
| DELETE                | `/auth/sessions/:id`                               | Session                        | Punya sendiri saja              |
| GET                   | `/health`                                          | Public                         | Ping DB, tidak perlu dipakai UI |
| GET/POST              | `/sites`                                           | Session (+SuperAdmin utk POST) |                                 |
| GET/PATCH/DELETE      | `/sites/:id`                                       | Session (+guard per aksi)      |                                 |
| POST/DELETE           | `/sites/:id/members` `/sites/:id/members/:userId`  | SuperAdmin                     |                                 |
| GET/POST/PATCH/DELETE | `/users`, `/users/:id`                             | SuperAdmin                     |                                 |
| GET/POST/PATCH/DELETE | `/sites/:siteId/news`, `/sites/:siteId/news/:id`   | Session + SiteMember           |                                 |
| POST                  | `/sites/:siteId/news/:id/publish`                  | Session + SiteMember           |                                 |
| GET/POST/PATCH/DELETE | `/sites/:siteId/pages`, `/sites/:siteId/pages/:id` | Session + SiteMember           |                                 |
| POST                  | `/sites/:siteId/pages/:id/publish`                 | Session + SiteMember           |                                 |

### Error shape

Validasi gagal (Zod) → `400` dengan body `[{ path: string, message: string }]`. Otorisasi gagal → `401` (belum login) atau `403` (login tapi tidak berhak), body `{ message, error, statusCode }`. UI harus map `400` ke error per-field di form, `401` ke redirect login, `403` ke halaman/toast "Access Denied".

### Belum ada (jangan diasumsikan)

Tidak ada OpenAPI/Swagger di backend saat ini — tidak ada spec untuk generate types otomatis. Admin app harus **hand-maintain** TypeScript types yang match Zod DTO backend (lihat §13 gap #5). Kalau backend DTO berubah, harus disinkronkan manual.

---

# 12. Non-Functional Requirements

- **Bahasa**: UI berbahasa Indonesia (konsisten dengan target user institusi Indonesia), istilah teknis boleh Inggris kalau tidak ada padanan umum.
- **Aksesibilitas**: form pakai label eksplisit, keyboard-navigable (shadcn-svelte sudah accessible by default via Bits UI/Melt UI).
- **Keamanan**: tidak pernah render `bodyMarkdown` mentah sebagai HTML tanpa sanitasi di preview pane (meskipun backend sudah sanitasi versi published, preview di admin harus sanitasi sisi client juga karena preview belum lewat backend sanitizer).
- **Performa**: SSR untuk initial load list (news/pages/sites), client-side navigation untuk transisi antar halaman setelahnya (SvelteKit default).
- **Error resilience**: kalau API down/timeout, tampilkan pesan jelas dengan tombol retry, bukan blank page.

---

# 13. Known Backend Gaps (dependencies untuk fitur Admin di atas)

Daftar ini eksplisit supaya tim backend tahu apa yang diblokir tim admin:

1. **Tidak ada `GET /sites/:id/builds`** — admin tidak bisa menampilkan riwayat/status build. Perlu endpoint baru + kemungkinan WebSocket/polling untuk status real-time. (Blocks §9.8)
2. **`PATCH /users/:id` super_admin-only** — user biasa tidak bisa ganti nama/password sendiri. Perlu endpoint `PATCH /users/me` atau izinkan self-update pada `/users/:id` kalau `id === currentUser.id`. (Blocks self-service profile page)
3. **Role editor/reviewer/author tidak dibedakan otorisasinya** — backend saat ini treat semua role sebagai "site member" yang sama untuk CRUD/publish konten. Kalau PRD utama menghendaki reviewer tidak bisa publish langsung (workflow approval), perlu guard baru di backend. (Blocks §9.3 workflow yang lebih ketat)
4. **Site_admin tidak bisa kelola member site-nya sendiri** — hanya super_admin. Kalau ingin delegasi (site_admin urus tim sendiri), perlu ubah guard di `POST/DELETE /sites/:id/members`. (Blocks §9.4 delegasi)
5. **Tidak ada OpenAPI/Swagger** — types harus di-maintain manual. Menambah `@nestjs/swagger` di backend akan signifikan mengurangi drift. (Blocks type-safety §11)
6. **Tidak ada endpoint search/autocomplete user by email** — `POST /sites/:id/members` butuh `userId` (UUID), UI harus fetch semua user dan filter client-side.
7. **`isHomepage` tidak unique-constrained** — bisa lebih dari satu page per site punya `isHomepage=true` tanpa error dari backend. UI harus validasi/warning sendiri (§9.7).
8. ~~**Tidak ada endpoint setup wizard**~~ — **RESOLVED.** `GET /setup/status` dan `POST /setup/init` sudah diimplementasikan (`src/modules/setup/`). Kontrak persis seperti dirancang: transaction-safe re-check (menolak 409 kalau `needsSetup` sudah false, dicek ulang di dalam transaction yang sama, bukan percaya response `/status` sebelumnya), auto-login lewat `AuthService.createSession()` (di-extract dari `login()` supaya reusable), role-seeding logic dishare antara CLI (`pnpm db:seed`) dan endpoint ini lewat `src/database/roles.seed.ts`. `SETUP_TOKEN` env var + header `X-Setup-Token` opsional sudah jalan (403 kalau token di-set tapi tidak cocok/tidak dikirim). Diverifikasi end-to-end: DB kosong → `needsSetup:true` → init sukses + cookie ter-set + `/auth/me` langsung authenticated tanpa login manual → `needsSetup:false` → percobaan init kedua ditolak 409.

Gap-gap ini bukan blocker untuk **mulai** membangun admin app — semuanya di area yang bisa di-workaround di UI (kecuali #1 dan #2 yang benar-benar butuh endpoint baru; #8 sudah selesai). Prioritaskan #1 dan #2 di iterasi backend berikutnya.

---

# 14. Success Metrics

- Editor bisa login → buat draft berita → publish, dalam < 2 menit tanpa dokumentasi tambahan (selaras dengan `docs/PRD.md` §21).
- Zero penggunaan `curl`/Postman oleh editor non-teknis setelah admin app live.
- Time-to-first-meaningful-paint dashboard < 1.5 detik di koneksi kampus standar.

---

# 15. Roadmap

## Phase 1 (dokumen ini)

Initial Setup Wizard, Auth, Sites, Users, Site Membership, News, Pages — persis seperti §9.

## Phase 2 (menunggu backend)

Block editor (TipTap) menggantikan markdown textarea, Media Library (upload + MinIO), Categories & Tags, Menu Builder, build status viewer.

## Phase 3+

Mengikuti `docs/PRD.md` §20 V2–V4: Widget, Theme picker, Official Plugin management, SEO fields, Revision history, Audit Log viewer, Search, Notification center, 2FA UI.
