# PRD — UNEJ CMS Native Portable Runtime

**Status:** Draft
**Project:** UNEJ CMS
**Feature:** Native Installer & Portable Infrastructure Runtime
**Target:** Windows, Linux, macOS
**Primary command:** `pnpm setup`

---

## 1. Overview

UNEJ CMS memiliki dua metode deployment:

1. Docker
2. Native

Docker tetap menjadi metode deployment yang direkomendasikan untuk production.

Native ditujukan untuk development, demo, workstation, server sederhana, dan pengguna yang tidak dapat atau tidak ingin menggunakan Docker.

Saat ini native installation masih bergantung pada PostgreSQL, Redis, dan MinIO yang harus tersedia pada sistem.

Feature ini mengubah mekanisme tersebut sehingga:

```bash
pnpm setup
```

dapat menyiapkan seluruh dependency UNEJ CMS secara otomatis.

Jika PostgreSQL, Redis-compatible server, atau MinIO belum tersedia, installer dapat menyediakan **portable runtime** yang terisolasi di dalam environment UNEJ CMS.

Target UX:

```text
git clone <repository>
cd unej-cms

pnpm setup
pnpm dev
```

Tanpa mewajibkan pengguna menginstal PostgreSQL, Redis, MinIO, atau Docker secara manual.

---

# 2. Goals

## 2.1 Primary Goals

Native installer harus:

- mudah digunakan;
- idempotent;
- tidak merusak environment pengguna;
- tidak mengganti service existing tanpa izin;
- mendukung portable infrastructure;
- dapat dijalankan ulang dengan aman;
- mendukung Windows sebagai first-class platform;
- tetap mendukung Linux dan macOS;
- memisahkan runtime binary dengan application source;
- melakukan health check setiap service;
- memberikan error yang mudah dipahami;
- menjaga versi infrastructure yang kompatibel dengan UNEJ CMS.

UX utama:

```bash
pnpm setup
```

Setelah selesai:

```bash
pnpm dev
```

harus cukup untuk menjalankan development environment.

---

# 3. Non-Goals

Feature ini bukan:

- pengganti Docker untuk semua production deployment;
- package manager OS;
- PostgreSQL distribution baru;
- Redis implementation;
- MinIO fork;
- container runtime;
- process manager production seperti systemd;
- mekanisme auto-update infrastructure production.

Portable runtime terutama ditujukan untuk:

- development;
- local testing;
- demo;
- workstation;
- instalasi sederhana.

Production tetap direkomendasikan menggunakan Docker atau infrastructure/service yang dikelola administrator.

---

# 4. Installation Modes

Installer menyediakan tiga mode infrastructure.

## 4.1 Auto

Default:

```bash
pnpm setup
```

Equivalent:

```bash
pnpm setup --infra=auto
```

Flow:

```text
Detect existing service
        │
        ├── compatible → reuse
        │
        └── unavailable
                ↓
         portable runtime
```

Installer tidak boleh mengganti service existing yang valid.

---

## 4.2 Portable

```bash
pnpm setup --infra=portable
```

Memaksa penggunaan runtime UNEJ CMS sendiri.

Contoh:

```text
.runtime/
├── postgres/
├── redis/
└── minio/

.data/
├── postgres/
├── redis/
└── minio/
```

System PostgreSQL/Redis/MinIO tidak digunakan.

---

## 4.3 System

```bash
pnpm setup --infra=system
```

UNEJ CMS hanya menggunakan service yang sudah tersedia pada OS.

Jika salah satu dependency tidak tersedia:

```text
ERROR

PostgreSQL was not found.

Install PostgreSQL or run:

pnpm setup --infra=portable
```

Installer tidak menginstall dependency system-wide secara otomatis.

---

## 4.4 Docker Infrastructure

Tetap dipertahankan:

```bash
pnpm setup --infra=docker
```

atau:

```bash
pnpm infra:up
```

Hanya infrastructure yang berjalan dalam Docker:

```text
PostgreSQL
Redis
MinIO
```

sedangkan:

```text
Backend
Dashboard
Builder Worker
```

berjalan native.

---

# 5. Runtime Directory

Portable runtime menggunakan:

```text
.runtime/
```

Contoh:

```text
.runtime/
├── manifest.json
│
├── postgres/
│   ├── bin/
│   └── lib/
│
├── redis/
│   └── ...
│
└── minio/
    └── ...
```

Runtime binary tidak boleh masuk Git.

`.gitignore`:

```gitignore
.runtime/
.data/
```

---

# 6. Data Directory

Persistent development data ditempatkan pada:

```text
.data/
```

Contoh:

```text
.data/
├── postgres/
│   ├── data/
│   └── logs/
│
├── redis/
│   ├── data/
│   └── logs/
│
├── minio/
│   └── data/
│
└── runtime/
    ├── pids/
    └── logs/
```

`.runtime` dan `.data` memiliki lifecycle berbeda.

```text
.runtime
    ↓
software binaries

.data
    ↓
user/application data
```

Menghapus `.runtime` tidak boleh otomatis menghapus `.data`.

---

# 7. Runtime Manifest

Runtime yang berhasil di-install dicatat pada:

```text
.runtime/manifest.json
```

Contoh:

```json
{
  "schemaVersion": 1,
  "platform": "win32",
  "arch": "x64",
  "services": {
    "postgres": {
      "version": "18.x",
      "installed": true
    },
    "redis": {
      "implementation": "compatible-runtime",
      "version": "x.x.x",
      "installed": true
    },
    "minio": {
      "version": "RELEASE.x",
      "installed": true
    }
  }
}
```

Manifest digunakan untuk:

- version detection;
- compatibility check;
- runtime repair;
- upgrade;
- diagnostics.

---

# 8. Runtime Version Policy

Versi infrastructure tidak boleh selalu mengambil `latest`.

Versi harus dikontrol UNEJ CMS.

Contoh:

```ts
export const runtimeVersions = {
  postgres: "...",
  redis: "...",
  minio: "...",
};
```

UNEJ CMS release harus memiliki known-compatible runtime versions.

Tujuan:

```text
UNEJ CMS v1.4
       │
       ├── PostgreSQL tested version
       ├── Redis-compatible tested version
       └── MinIO tested version
```

Hal ini membuat instalasi reproducible.

---

# 9. Platform Detection

Runtime manager harus mendeteksi:

```ts
process.platform;
process.arch;
```

Minimum target:

```text
Windows x64
Linux x64
Linux arm64
macOS arm64
macOS x64
```

Platform unsupported harus menghasilkan error eksplisit.

Contoh:

```text
Unsupported platform:

Platform : linux
Architecture : armv7

Supported:
- win32-x64
- linux-x64
- linux-arm64
- darwin-x64
- darwin-arm64
```

---

# 10. Runtime Download

Runtime tidak disimpan di repository Git.

Installer mendownload binary ketika dibutuhkan.

Flow:

```text
Resolve runtime
      ↓
Download archive
      ↓
Verify checksum
      ↓
Extract temporary directory
      ↓
Validate executable
      ↓
Atomic move
      ↓
.runtime/<service>
```

Download yang gagal tidak boleh meninggalkan runtime seolah-olah berhasil di-install.

---

# 11. Security Requirements

Setiap binary portable wajib memiliki:

- pinned source;
- pinned version;
- SHA-256 checksum;
- HTTPS download;
- verification sebelum extraction/activation.

Contoh manifest internal:

```ts
{
  platform: 'win32-x64',
  url: '...',
  sha256: '...'
}
```

Installer harus menolak binary jika:

```text
expected checksum != actual checksum
```

Error:

```text
Runtime verification failed.

Service:
PostgreSQL

Expected SHA-256:
...

Actual SHA-256:
...

Installation aborted.
```

Tidak boleh fallback menjalankan binary yang gagal diverifikasi.

---

# 12. PostgreSQL Runtime

Portable PostgreSQL bertanggung jawab atas:

```text
install
initialize
start
stop
healthCheck
```

Struktur:

```text
.runtime/postgres/
└── ...

.data/postgres/
├── data/
└── logs/
```

Jika database belum diinisialisasi:

```text
initdb
    ↓
.data/postgres/data
```

Kemudian CMS membuat:

```text
database: unej_cms
user: unej_cms
password: generated secret
```

Credential harus dibuat secara random saat instalasi pertama.

Tidak boleh menggunakan password production-hardcoded di source code.

---

# 13. PostgreSQL Port

Portable runtime tidak boleh mengasumsikan `5432` selalu tersedia.

Flow:

```text
try configured port
       ↓
available?
├── yes → use
└── no
     ↓
select available managed port
```

Hasilnya disimpan ke environment/config generated.

Contoh:

```env
DATABASE_HOST=127.0.0.1
DATABASE_PORT=54321
DATABASE_NAME=unej_cms
DATABASE_USER=unej_cms
DATABASE_PASSWORD=<generated>
```

---

# 14. Redis-Compatible Runtime

CMS menggunakan Redis protocol untuk:

- BullMQ;
- queue;
- cache;
- supporting runtime state.

Runtime manager boleh menggunakan Redis-compatible implementation yang secara resmi didukung oleh UNEJ CMS.

Aplikasi tidak boleh bergantung pada implementation-specific feature tanpa kebutuhan.

Application configuration tetap:

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Abstraksi aplikasi harus tetap menganggapnya sebagai Redis-compatible endpoint.

---

# 15. MinIO Runtime

Portable MinIO:

```text
.runtime/minio/

.data/minio/data/
```

Runtime manager harus:

1. memastikan binary tersedia;
2. generate credentials;
3. memilih port;
4. menjalankan server;
5. melakukan health check;
6. memastikan bucket CMS tersedia.

Contoh environment:

```env
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ACCESS_KEY=<generated>
MINIO_SECRET_KEY=<generated>
MINIO_BUCKET=unej-cms
```

Console dapat menggunakan port berbeda:

```text
http://127.0.0.1:9001
```

---

# 16. Runtime Service Interface

Setiap service mengikuti interface yang sama.

```ts
export interface RuntimeService {
  detect(): Promise<ServiceDetection>;

  install(): Promise<void>;

  initialize(): Promise<void>;

  start(): Promise<void>;

  stop(): Promise<void>;

  healthCheck(): Promise<boolean>;
}
```

Optional:

```ts
status(): Promise<ServiceStatus>;

repair(): Promise<void>;

version(): Promise<string | null>;
```

---

# 17. Runtime Manager

Buat abstraction:

```text
RuntimeManager
│
├── PostgreSQLRuntime
├── RedisRuntime
└── MinioRuntime
```

RuntimeManager bertanggung jawab atas:

```text
detect
resolve
install
initialize
start
health check
stop
diagnostics
```

Business/application code tidak boleh menangani lifecycle portable infrastructure secara langsung.

---

# 18. Proposed Structure

```text
scripts/
├── setup.ts
├── start.ts
├── dev.ts
│
├── runtime/
│   ├── runtime-manager.ts
│   ├── runtime-service.ts
│   ├── platform.ts
│   ├── ports.ts
│   ├── download.ts
│   ├── checksum.ts
│   ├── archive.ts
│   ├── process.ts
│   │
│   ├── postgres/
│   │   ├── index.ts
│   │   ├── manifest.ts
│   │   └── postgres-runtime.ts
│   │
│   ├── redis/
│   │   ├── index.ts
│   │   ├── manifest.ts
│   │   └── redis-runtime.ts
│   │
│   └── minio/
│       ├── index.ts
│       ├── manifest.ts
│       └── minio-runtime.ts
│
└── setup/
    ├── environment.ts
    ├── dependencies.ts
    ├── workspace.ts
    ├── build.ts
    └── migration.ts
```

---

# 19. Setup Flow

Main command:

```bash
pnpm setup
```

Flow:

```text
UNEJ CMS Setup
      │
      ▼
Check Node
      │
      ▼
Check pnpm
      │
      ▼
Detect platform
      │
      ▼
Resolve infrastructure mode
      │
      ▼
PostgreSQL
├── detect
├── install if required
├── initialize
└── health check
      │
Redis
├── detect
├── install if required
└── health check
      │
MinIO
├── detect
├── install if required
├── initialize
└── health check
      │
      ▼
Generate environment
      │
      ▼
pnpm install
      │
      ▼
pnpm build
      │
      ▼
Database migration
      │
      ▼
Storage initialization
      │
      ▼
DONE
```

---

# 20. Environment Generation

Environment harus dibuat setelah runtime configuration diketahui.

Installer mengelola:

```text
.env
apps/backend/.env
apps/dashboard/.env
```

File existing tidak boleh ditimpa tanpa alasan eksplisit.

Installer harus dapat membedakan:

```text
user-managed value
```

dengan:

```text
installer-managed runtime value
```

Direkomendasikan memiliki state:

```text
.data/runtime/config.json
```

untuk menyimpan runtime resolution.

Contoh:

```json
{
  "mode": "portable",
  "postgres": {
    "host": "127.0.0.1",
    "port": 54321
  },
  "redis": {
    "host": "127.0.0.1",
    "port": 6379
  },
  "minio": {
    "host": "127.0.0.1",
    "port": 9000,
    "consolePort": 9001
  }
}
```

---

# 21. `pnpm dev`

`pnpm dev` harus mampu menggunakan portable infrastructure.

Flow:

```text
pnpm dev
    │
    ▼
RuntimeManager.ensureRunning()
    │
    ├── PostgreSQL
    ├── Redis
    └── MinIO
    │
    ▼
Backend
Builder Worker
Dashboard
Package Watchers
```

Jika infrastructure sudah berjalan, jangan membuat proses duplikat.

---

# 22. `pnpm start`

`pnpm start` juga harus memeriksa managed runtime.

```text
pnpm start
      │
      ▼
Read runtime configuration
      │
      ▼
Managed runtime?
├── no → do not manage external services
└── yes
      ↓
ensureRunning()
      │
      ▼
API
Builder Worker
Dashboard
```

PENTING:

Jika environment menggunakan infrastructure external/system, `pnpm start` **tidak boleh mencoba stop/start service milik OS**.

Runtime manager hanya boleh mengelola process yang dimiliki UNEJ CMS.

---

# 23. Process Ownership

Setiap portable process harus mempunyai ownership metadata.

Contoh:

```text
.data/runtime/pids/
├── postgres.pid
├── redis.pid
└── minio.pid
```

Namun PID saja tidak cukup.

Sebelum melakukan kill, runtime manager harus memastikan process tersebut benar-benar process UNEJ CMS.

Jangan pernah:

```text
read PID
↓
kill PID blindly
```

karena PID dapat digunakan ulang oleh OS.

Validation dapat mempertimbangkan:

- executable path;
- command arguments;
- runtime directory;
- process start metadata.

---

# 24. Graceful Shutdown

Runtime manager menyediakan:

```bash
pnpm runtime:stop
```

yang menghentikan hanya managed portable services.

Tambahkan:

```bash
pnpm runtime:start
pnpm runtime:stop
pnpm runtime:status
pnpm runtime:doctor
```

---

# 25. Runtime Doctor

Command:

```bash
pnpm runtime:doctor
```

Contoh output:

```text
UNEJ CMS Runtime Doctor

Platform
✓ Windows x64

Node
✓ v24.x

pnpm
✓ v10.x

PostgreSQL
✓ portable
✓ running
✓ 127.0.0.1:54321
✓ database reachable

Redis
✓ portable
✓ running
✓ 127.0.0.1:6379

MinIO
✓ portable
✓ running
✓ API: 127.0.0.1:9000
✓ Console: 127.0.0.1:9001
✓ bucket available

Backend configuration
✓ valid

Dashboard configuration
✓ valid

Result:
All checks passed.
```

Ini menjadi command utama troubleshooting.

---

# 26. Port Collision Handling

Installer harus mendeteksi collision untuk:

```text
PostgreSQL
Redis
MinIO API
MinIO Console
Backend
Dashboard
```

Portable service boleh memilih port lain.

System/external service tidak boleh dipindahkan oleh installer.

Contoh:

```text
Port 5432 already in use.

Existing PostgreSQL detected:
PostgreSQL 17

Using existing service.
```

atau portable mode:

```text
Port 5432 already in use.

Portable PostgreSQL assigned:
127.0.0.1:54321
```

---

# 27. Existing Infrastructure Detection

`auto` harus mencoba menentukan apakah service yang ditemukan benar-benar service yang sesuai.

Jangan hanya:

```text
port 5432 open
→ PostgreSQL exists
```

Harus melakukan protocol/health validation.

Contoh PostgreSQL:

```text
connect
→ authenticate/probe
→ version
```

MinIO:

```text
health endpoint
```

Redis:

```text
PING
```

---

# 28. Idempotency

Command berikut:

```bash
pnpm setup
pnpm setup
pnpm setup
```

harus aman.

Run berikutnya seharusnya:

```text
[✓] Runtime already installed
[✓] PostgreSQL initialized
[✓] Redis available
[✓] MinIO initialized
[✓] Environment exists
[✓] Dependencies installed
[✓] Build successful
[✓] Database migrations up to date
```

Tidak boleh:

- reset database;
- generate credential baru;
- menghapus media;
- overwrite environment user;
- reinitialize PostgreSQL;
- menghapus bucket.

---

# 29. Reset

Jangan jadikan reset bagian implicit dari setup.

Sediakan command eksplisit:

```bash
pnpm runtime:reset
```

Reset harus meminta confirmation kecuali:

```bash
pnpm runtime:reset --yes
```

Reset portable data berarti destructive operation.

Output harus jelas:

```text
WARNING

This will delete:

- local PostgreSQL database
- local Redis data
- local MinIO objects

This cannot be undone.
```

---

# 30. Runtime Repair

Sediakan:

```bash
pnpm runtime:repair
```

Repair hanya memperbaiki runtime binary/configuration.

Secara default **tidak boleh menghapus `.data`**.

Contoh:

```text
.runtime/postgres corrupted
        ↓
runtime:repair
        ↓
download PostgreSQL again
        ↓
reuse .data/postgres
```

---

# 31. Upgrade

Runtime upgrade harus terpisah dari normal startup.

Future command:

```bash
pnpm runtime:upgrade
```

Jangan melakukan major PostgreSQL upgrade secara diam-diam.

Jika UNEJ CMS versi baru membutuhkan major PostgreSQL berbeda:

```text
Migration required.

Current PostgreSQL:
17

Required:
18

Automatic major database upgrade is not supported.

Follow:
docs/runtime/postgresql-upgrade.md
```

Data safety lebih penting daripada otomatisasi.

---

# 32. Logging

Portable services menulis log ke:

```text
.data/runtime/logs/
```

atau service-specific:

```text
.data/postgres/logs/
.data/redis/logs/
.data/minio/logs/
```

Runtime manager harus menampilkan lokasi log ketika terjadi kegagalan.

Contoh:

```text
MinIO failed to start.

Log:
.data/minio/logs/minio.log

Run:
pnpm runtime:doctor
```

---

# 33. CLI UX

Setup output harus mudah dipahami.

Contoh:

```text
UNEJ CMS Setup
────────────────────────────────

System
✓ Windows x64
✓ Node v24
✓ pnpm v10

Infrastructure
✓ PostgreSQL  — portable
✓ Redis       — portable
✓ MinIO       — portable

Workspace
✓ Environment
✓ Dependencies
✓ Packages
✓ Backend
✓ Dashboard

Database
✓ Connection
✓ Migrations

Storage
✓ MinIO
✓ Bucket unej-cms

────────────────────────────────

UNEJ CMS is ready.

Run:

  pnpm dev

Dashboard:
  http://localhost:5173

First installation:
  http://localhost:5173/setup
```

---

# 34. Failure UX

Jangan menampilkan stack trace sebagai satu-satunya informasi.

Buruk:

```text
Error: ECONNREFUSED
at Socket...
```

Baik:

```text
PostgreSQL failed to start.

Reason:
Port 54321 could not be opened.

Try:

pnpm runtime:doctor

Log:
.data/postgres/logs/postgres.log
```

Stack trace dapat ditampilkan dengan:

```bash
pnpm setup --debug
```

---

# 35. CLI Commands

Target commands:

```bash
# Installation
pnpm setup

pnpm setup --infra=auto
pnpm setup --infra=portable
pnpm setup --infra=system
pnpm setup --infra=docker

# Runtime
pnpm runtime:start
pnpm runtime:stop
pnpm runtime:status
pnpm runtime:doctor
pnpm runtime:repair

# Development
pnpm dev

# Production-like native
pnpm start

# Docker
pnpm docker:up
pnpm docker:down

# Hybrid
pnpm infra:up
pnpm infra:down
```

---

# 36. Existing Setup Flags

Pertahankan:

```bash
pnpm setup --yes
pnpm setup --skip-infra
pnpm setup --skip-build
pnpm setup --skip-migrate
```

Rules:

### `--yes`

Non-interactive.

Tidak boleh otomatis menyetujui destructive operation yang tidak secara eksplisit termasuk dalam command.

### `--skip-infra`

Jangan install/start infrastructure.

### `--skip-build`

Lewati workspace build.

### `--skip-migrate`

Lewati migration.

---

# 37. CI Behavior

CI tidak seharusnya secara default mendownload portable runtime jika environment CI sudah menyediakan infrastructure.

Contoh:

```bash
pnpm setup \
  --yes \
  --infra=system
```

atau:

```bash
pnpm setup \
  --yes \
  --skip-infra
```

Docker CI juga tetap supported.

---

# 38. Windows Launcher

Untuk mempermudah pengguna Windows, sediakan:

```text
setup.ps1
start.ps1
```

Optional compatibility launcher:

```text
setup.cmd
start.cmd
```

`setup.ps1` bertugas:

```text
check Node
↓
check Corepack/pnpm
↓
invoke pnpm setup
```

Ia tidak boleh menduplikasi business logic installer.

Logic utama tetap berada pada TypeScript runtime manager.

---

# 39. Repository Structure

Target monorepo:

```text
unej-cms/
│
├── apps/
│   ├── backend/
│   ├── dashboard/
│   └── builder/
│
├── packages/
│   └── sdk/
│
├── plugins/
├── themes/
│
├── scripts/
│   ├── setup.ts
│   ├── start.ts
│   ├── dev.ts
│   ├── runtime/
│   └── setup/
│
├── deploy/
│
├── .runtime/          # ignored
├── .data/             # ignored
│
├── setup.ps1
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── package.json
└── docker-compose.yml
```

---

# 40. `.gitignore`

Minimum:

```gitignore
node_modules/
dist/
*.tsbuildinfo

.DS_Store
coverage/

*.generated.ts
.svelte-cache/
.test-svelte-cache/

.pnpm-store/

# UNEJ CMS portable infrastructure
.runtime/
.data/

# Environment
.env
apps/backend/.env
apps/dashboard/.env
```

Runtime binary, local database, object storage, credentials, logs, dan PID files tidak boleh masuk repository.

---

# 41. Root `package.json`

Target scripts:

```json
{
  "scripts": {
    "setup": "...",
    "dev": "...",
    "start": "...",
    "build": "...",
    "typecheck": "...",
    "test": "...",

    "runtime:start": "...",
    "runtime:stop": "...",
    "runtime:status": "...",
    "runtime:doctor": "...",
    "runtime:repair": "...",

    "infra:up": "...",
    "infra:down": "...",

    "docker:up": "...",
    "docker:down": "..."
  }
}
```

Implementasi command tidak boleh bergantung pada shell syntax yang hanya bekerja pada Linux.

Gunakan Node/TypeScript untuk cross-platform orchestration.

---

# 42. Architecture Boundary

Infrastructure lifecycle:

```text
scripts/runtime
```

Application:

```text
apps/backend
apps/dashboard
```

Backend tidak boleh memiliki logic seperti:

```ts
startPostgres();
downloadMinio();
```

Backend hanya menerima configuration:

```text
DATABASE_URL
REDIS_URL
MINIO_ENDPOINT
```

Dengan demikian backend tidak mengetahui apakah infrastructure berasal dari:

```text
Portable
Docker
System
Cloud
Managed Service
```

---

# 43. Production Compatibility

Arsitektur harus memungkinkan konfigurasi seperti:

```text
UNEJ CMS
│
├── PostgreSQL → managed PostgreSQL
├── Redis → managed Redis
└── Object Storage → external S3-compatible storage
```

Portable runtime tidak boleh menjadi requirement aplikasi.

Ini hanya convenience layer installer.

---

# 44. Runtime Abstraction

Target akhir:

```text
                  UNEJ CMS
                     │
                     ▼
               Configuration
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
   PostgreSQL      Redis      Object Storage
       ▲             ▲             ▲
       │             │             │
 ┌─────┴───────────────────────────┴─────┐
 │                                     │
Portable     System     Docker     Managed
```

Application layer tidak mengetahui pilihan deployment tersebut.

---

# 45. Testing Requirements

## Unit Test

Minimum:

```text
platform detection
port detection
checksum validation
manifest parsing
runtime resolution
environment generation
process ownership validation
```

## Integration Test

Minimum:

```text
fresh portable installation
second setup run
runtime restart
port collision
corrupted runtime
database unavailable
MinIO unavailable
invalid checksum
existing infrastructure
```

## Critical Scenario

Harus diuji:

```text
pnpm setup
↓
create content
↓
stop everything
↓
pnpm setup again
↓
content still exists
```

---

# 46. Windows Acceptance Test

Clean Windows machine dengan:

```text
Node installed
Git installed

NO:
Docker
PostgreSQL
Redis
MinIO
```

Kemudian:

```bash
git clone ...
cd unej-cms
pnpm setup
pnpm dev
```

Expected:

```text
✓ infrastructure installed
✓ infrastructure started
✓ migrations completed
✓ dashboard accessible
✓ /setup accessible
```

Tidak membutuhkan instalasi PostgreSQL/Redis/MinIO manual.

---

# 47. Acceptance Criteria

Feature dianggap selesai jika:

- [ ] `pnpm setup` bekerja pada clean Windows machine.
- [ ] Docker tidak diwajibkan untuk portable mode.
- [ ] PostgreSQL portable dapat di-install dan dijalankan.
- [ ] Redis-compatible runtime dapat dijalankan.
- [ ] MinIO portable dapat dijalankan.
- [ ] Binary diverifikasi menggunakan checksum.
- [ ] Runtime versions pinned.
- [ ] `.runtime` terpisah dari `.data`.
- [ ] Credentials dibuat secara aman.
- [ ] Port collision ditangani.
- [ ] `pnpm setup` idempotent.
- [ ] Setup kedua tidak menghapus data.
- [ ] `pnpm dev` memastikan managed runtime berjalan.
- [ ] `pnpm start` memastikan managed runtime berjalan.
- [ ] External/system service tidak pernah dihentikan RuntimeManager.
- [ ] `pnpm runtime:start` tersedia.
- [ ] `pnpm runtime:stop` tersedia.
- [ ] `pnpm runtime:status` tersedia.
- [ ] `pnpm runtime:doctor` tersedia.
- [ ] `pnpm runtime:repair` tersedia.
- [ ] Runtime repair tidak menghapus data.
- [ ] Error message memiliki remediation yang jelas.
- [ ] Windows menjadi first-class supported platform.
- [ ] Linux tetap supported.
- [ ] macOS tetap supported.
- [ ] Docker workflow lama tetap berfungsi.
- [ ] Hybrid infrastructure workflow tetap berfungsi.

---

# 48. Implementation Phases

## Phase 1 — Runtime Foundation

Implement:

```text
RuntimeService
RuntimeManager
platform detection
port detection
process runner
checksum
download
archive extraction
runtime manifest
runtime config
```

Belum perlu semua service.

---

## Phase 2 — MinIO

Implement MinIO terlebih dahulu karena lifecycle portable relatif sederhana.

Target:

```bash
pnpm runtime:start
```

dapat menjalankan MinIO portable.

---

## Phase 3 — PostgreSQL

Implement:

```text
download
extract
initdb
database/user provisioning
start
stop
health check
persistent data
```

Ini adalah bagian paling critical karena menyangkut persistent CMS data.

---

## Phase 4 — Redis-Compatible Runtime

Implement:

```text
download
start
stop
PING health check
persistence where required
BullMQ compatibility test
```

---

## Phase 5 — Setup Integration

Hubungkan:

```bash
pnpm setup
```

dengan RuntimeManager.

Flow lengkap:

```text
runtime
→ env
→ install
→ build
→ migrate
→ storage init
```

---

## Phase 6 — Development Runner

Integrasikan:

```bash
pnpm dev
```

dengan:

```text
RuntimeManager.ensureRunning()
```

---

## Phase 7 — Native Start

Integrasikan:

```bash
pnpm start
```

tanpa mengganggu external infrastructure.

---

## Phase 8 — Doctor & Repair

Tambahkan:

```bash
pnpm runtime:status
pnpm runtime:doctor
pnpm runtime:repair
```

---

## Phase 9 — Windows UX

Tambahkan:

```text
setup.ps1
start.ps1
```

dan lakukan acceptance test pada clean Windows VM.

---

# 49. Recommended README UX

Bagian instalasi native akhirnya disederhanakan menjadi:

## Native

Butuh Node.js 22+.

```bash
pnpm setup
pnpm dev
```

`pnpm setup` akan mendeteksi environment secara otomatis. Jika PostgreSQL, Redis, dan MinIO belum tersedia, UNEJ CMS dapat menyediakan portable runtime yang terisolasi tanpa membutuhkan Docker.

Data development disimpan di `.data/`, sedangkan infrastructure binaries berada di `.runtime/`.

Untuk diagnosis:

```bash
pnpm runtime:doctor
```

Untuk menghentikan portable infrastructure:

```bash
pnpm runtime:stop
```

Docker tetap tersedia untuk production dan development:

```bash
docker compose up -d
```

---

# 50. Core Design Principle

Prinsip utama implementasi:

> **Portable runtime adalah fasilitas installer, bukan dependency arsitektural UNEJ CMS.**

Backend harus tetap dapat berjalan dengan PostgreSQL, Redis, dan object storage dari mana pun.

Target pengalaman pengguna:

```text
                UNEJ CMS
                   │
             pnpm setup
                   │
          "just make it work"
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    PostgreSQL   Redis      MinIO
        │          │          │
        └──────────┼──────────┘
                   ▼
              pnpm dev
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
       API       Worker    Dashboard
                   │
                   ▼
          localhost:5173/setup
```

Pengguna baru tidak perlu memahami topology internal UNEJ CMS untuk dapat menjalankan CMS, tetapi developer dan administrator tetap memiliki kontrol penuh terhadap infrastructure yang digunakan.
