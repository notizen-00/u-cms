# Product Requirements Document (PRD)

# Unej CMS

### Secure Headless CMS Platform

Version: 1.0 MVP

Status: Draft

---

# 1. Overview

## Vision

Membangun **Headless CMS modern** sebagai pengganti WordPress yang memiliki pengalaman penggunaan yang familiar namun jauh lebih aman, cepat, scalable, dan mudah dipelihara.

CMS dirancang khusus untuk:

* Universitas
* Fakultas
* Pemerintahan
* Instansi
* Perusahaan
* Organisasi

dengan fokus utama:

* Security
* Performance
* SEO
* Multi Website
* Headless Architecture

---

# 2. Background

Saat ini banyak website WordPress mengalami masalah:

* Website disusupi malware
* Redirect ke situs judi
* Plugin rentan
* Theme bajakan
* Update yang sering menyebabkan konflik
* Plugin saling tidak kompatibel
* Performance menurun karena plugin terlalu banyak
* Sulit dikembangkan menjadi sistem enterprise

Karena itu dibutuhkan CMS baru yang:

* Modern
* Secure by Design
* Plugin resmi
* Theme resmi
* Headless
* Mudah digunakan editor

---

# 3. Goals

## Business Goals

* Menggantikan WordPress untuk seluruh website institusi.
* Mengurangi biaya maintenance.
* Menghilangkan risiko plugin pihak ketiga.
* Menyediakan CMS modern.
* Menjadi platform website resmi institusi.
* Mendukung multi-site.

---

## Technical Goals

* Headless CMS.
* REST API First.
* Static Site Generation.
* Multi Website.
* Multi Theme.
* Official Plugin.
* Clean Architecture.
* Secure by Default.

---

# 4. Non Goals

Versi pertama tidak mencakup:

* Marketplace Plugin
* Marketplace Theme
* Upload Plugin
* Upload Theme
* PHP Code Editor
* Theme Editor
* File Manager
* Raw HTML Editor
* Arbitrary JavaScript
* Arbitrary CSS Injection

---

# 5. Target User

## Super Administrator

Mengelola seluruh CMS.

Hak akses:

* seluruh website
* plugin
* theme
* setting sistem
* user
* security

---

## Site Administrator

Mengelola satu website.

Hak akses:

* berita
* halaman
* menu
* media
* setting website

---

## Editor

Mengelola konten.

---

## Reviewer

Melakukan review.

---

## Author

Menulis artikel.

---

## Media Manager

Mengelola media.

---

## SEO Manager

Mengelola SEO.

---

# 6. Product Architecture

```text
SvelteKit Admin
        │
 REST API
        │
NestJS Headless CMS
        │
 PostgreSQL
 Redis
 MinIO
        │
 Build Queue
        │
 Static Builder
        │
 SvelteKit Website
        │
 Static HTML
        │
 Nginx/CDN
```

---

# 7. Core Features

## Authentication

* Login
* Logout
* Forgot Password
* Reset Password
* 2FA
* Session Management
* Login History

---

## User Management

* User
* Role
* Permission
* Group
* Multi Site Access

---

## Website Management

* Multiple Website
* Domain
* Logo
* Favicon
* Theme
* Plugin
* SEO

---

## News Management

Setara WordPress Post.

Fitur:

* Create
* Edit
* Delete
* Draft
* Preview
* Publish
* Scheduled Publish
* Archive
* Trash
* Restore
* Duplicate
* Bulk Action
* Featured Image
* Excerpt
* Category
* Tag
* Related Post
* Reading Time
* Revision

---

## Pages

Setara WordPress Page.

* Parent Page
* Child Page
* Homepage
* Landing Page
* Preview
* Draft
* Publish
* Revision

---

## Media Library

* Upload Image
* Upload PDF
* Folder
* Search
* Replace File
* Crop
* Resize
* Compression
* WebP
* AVIF
* Usage Tracking

---

## Categories

* Hierarchical
* SEO
* Slug
* Description

---

## Tags

* Create
* Merge
* Delete

---

## Menu Builder

Drag & Drop

Header

Footer

Sidebar

Mega Menu

---

## Widget

Widget resmi.

Contoh:

* Latest News
* Gallery
* FAQ
* Contact
* Statistics
* Download

---

## Theme

Official Theme.

Tidak dapat upload ZIP.

---

## Plugin

Official Plugin.

Tidak dapat upload ZIP.

---

## SEO

* Meta Title
* Description
* Canonical
* Sitemap
* Robots
* Open Graph
* Twitter Card
* Redirect

---

## Search

* Full Text Search
* Filter
* Highlight

---

## Audit Log

Seluruh aktivitas tercatat.

---

## Notification

* Email
* In App
* Queue

---

# 8. WordPress Compatibility

CMS dibuat agar editor WordPress langsung familiar.

| WordPress  | Unej CMS         |
| ---------- | ---------------- |
| Posts      | News             |
| Pages      | Pages            |
| Categories | Categories       |
| Tags       | Tags             |
| Media      | Media Library    |
| Appearance | Theme            |
| Plugins    | Official Plugins |
| Menus      | Menu Builder     |
| Widgets    | Widgets          |
| Users      | Users            |
| Settings   | Settings         |

---

# 9. Official Plugin

Plugin hanya dari tim CMS.

Versi pertama:

* News
* Gallery
* FAQ
* Agenda
* Contact
* Download
* Staff Directory
* Organization Structure
* Research
* Public Service
* Analytics
* Redirect
* SEO
* Newsletter
* Forms
* WordPress Import

---

# 10. Theme

Theme resmi.

Versi pertama:

* Institutional
* Faculty Modern
* Faculty Classic
* Library
* News Portal
* Government
* Landing Page

---

# 11. Block Editor

Editor menggunakan block.

Block bawaan:

* Paragraph
* Heading
* Image
* Gallery
* Video
* Table
* Quote
* Button
* Columns
* CTA
* Statistics
* FAQ
* Accordion
* Tabs
* Download
* Related News
* Contact Form

Tidak boleh ada:

* Script
* PHP
* Raw HTML
* iframe bebas

---

# 12. Workflow

Draft

↓

Review

↓

Revision

↓

Approved

↓

Scheduled

↓

Published

↓

Archived

---

# 13. Security

Tidak tersedia:

* File Manager
* Theme Editor
* Plugin Upload
* Plugin Marketplace
* Theme Upload
* PHP Execution
* JavaScript Upload
* Shell Access

Wajib:

* CSRF
* CSP
* Secure Cookie
* 2FA
* Audit Log
* Rate Limit
* Virus Scan
* MIME Validation
* EXIF Removal

---

# 14. Static Website Builder

Ketika editor Publish:

```
Publish Article

↓

Update Database

↓

Queue Build

↓

Builder Worker

↓

Generate Static HTML

↓

Atomic Deploy

↓

Website Updated
```

Tidak ada Docker command yang dijalankan langsung dari backend.

---

# 15. Public API

Website hanya menggunakan REST API.

```
GET /site
GET /posts
GET /pages
GET /categories
GET /menus
GET /search
```

---

# 16. Admin API

```
POST /login

GET /posts

POST /posts

PATCH /posts

DELETE /posts

POST /publish

POST /schedule

POST /restore
```

---

# 17. Technology

## Backend

* NestJS 11
* TypeScript
* Bun
* PostgreSQL
* Redis
* BullMQ
* MinIO
* Drizzle ORM

---

## Frontend

Admin

* SvelteKit
* Tailwind
* shadcn-svelte
* TipTap

Website

* SvelteKit
* Static Generation

---

## Infrastructure

* Docker
* Docker Compose
* Nginx
* Cloudflare

---

# 18. Development Architecture

```
apps/

api/
admin/
web/
builder/

packages/

contracts/
sdk/
ui/
blocks/

plugins/

themes/
```

---

# 19. MVP

Versi pertama:

✅ Authentication

✅ User

✅ Role

✅ Website

✅ News

✅ Pages

✅ Categories

✅ Tags

✅ Media

✅ Block Editor

✅ Menu

✅ Theme

✅ Official Plugin

✅ SEO

✅ Revision

✅ Audit Log

✅ REST API

✅ Static Builder

---

# 20. Future Roadmap

## V1

Core CMS

---

## V2

Visual Page Builder

Form Builder

Comment

Newsletter

---

## V3

AI Content Assistant

AI Translation

AI SEO

AI Image Optimization

AI Search

---

## V4

Marketplace (Official Only)

Premium Theme

Premium Plugin

Multi Language

Headless GraphQL

---

# 21. Success Metrics

* Editor dapat mempublikasikan berita < 2 menit.
* Waktu build website < 30 detik untuk perubahan konten biasa.
* Lighthouse Performance > 95.
* Lighthouse SEO > 95.
* Zero arbitrary code execution dari dashboard.
* Zero plugin pihak ketiga.
* Zero theme pihak ketiga.
* Mendukung minimal 100 website dalam satu instalasi tanpa perubahan arsitektur.
