PRD — Theme-Aware Page Builder UNEJ CMS

1. Ringkasan

Fitur ini memungkinkan UNEJ CMS memiliki Page Builder yang tetap generik, tetapi dapat memahami kemampuan masing-masing theme.

Contoh:

Faculty Theme → video hero, academic search, news grid.
Joy Theme → image hero, mega menu, event grid.
Page tetap disimpan sebagai data CMS.
Theme bertugas merender data tersebut menjadi tampilan.
Preview menggunakan renderer theme sebenarnya, sehingga hasil preview sedekat mungkin dengan website production.

Tujuan utamanya adalah:

Theme bebas memiliki desain dan komponen unik tanpa membuat Page Builder bergantung pada implementasi theme tertentu.

2. Problem Statement

Saat ini terdapat potensi masalah:

Page Builder
↓
Block
↓
Theme

Jika setiap theme mempunyai struktur homepage berbeda, Page Builder akan sulit menangani semuanya.

Contoh:

Faculty
Homepage
├── Video Hero
├── Search
├── News
└── Announcement
Joy
Homepage
├── Image Hero
├── Mega Menu
├── News
└── Events

Jika builder hanya menyediakan block generik, Video Hero atau Mega Menu mungkin tidak tersedia.

Sebaliknya, jika semua block dibuat khusus untuk setiap theme, builder akan menjadi sangat kompleks.

3. Goals
   Primary Goals
   Page Builder bersifat theme-aware.
   Theme dapat mendeklarasikan block yang didukung.
   Theme dapat menyediakan custom block.
   CMS tetap memiliki Core Block universal.
   Page tetap berupa data/JSON yang independen dari implementasi UI.
   Preview menggunakan renderer theme yang sebenarnya.
   Theme dapat diganti tanpa menghilangkan content.
   Unsupported block dapat dideteksi dan ditangani.
   Theme dapat menyediakan fallback block.
   Developer dapat membuat theme baru tanpa mengubah core Page Builder.
   Non Goals

Fitur ini tidak bertujuan untuk:

membuat setiap theme memiliki builder sendiri;
menyimpan HTML hasil render sebagai sumber utama content;
membuat Page Builder mengetahui kode Svelte theme;
mengubah seluruh struktur CMS menjadi theme-specific. 4. Konsep Arsitektur
UNEJ CMS
│
┌────────────┴────────────┐
│ │
Page Builder Theme Registry
│ │
│ ┌───────────┴───────────┐
│ │ │
│ Faculty Theme Joy Theme
│ │ │
└─────────────┴───────────┬───────────┘
│
Theme Renderer
│
▼
Website HTML

Prinsip:

Content ≠ Presentation

Page menyimpan content structure, sedangkan theme menentukan presentation.

5. Block Architecture

UNEJ CMS memiliki tiga level block.

5.1 Core Block

Block yang disediakan oleh CMS.

Contoh:

core.text
core.image
core.video
core.hero
core.button
core.columns
core.search
core.news
core.events
core.gallery

Core block harus dapat digunakan oleh berbagai theme.

5.2 Theme Block

Block khusus theme.

Faculty
faculty.video-hero
faculty.academic-search
faculty.faculty-profile
Joy
joy.image-hero
joy.mega-menu
joy.announcement

Theme block hanya tersedia jika theme tersebut aktif.

5.3 Plugin/Custom Block

Untuk kebutuhan eksternal.

Contoh:

plugin.calendar
plugin.staff-directory
plugin.research-statistic
plugin-campus-map

Plugin dapat mendaftarkan block ke CMS melalui SDK.

6. Theme Manifest

Setiap theme wajib memiliki manifest.json.

Contoh:

{
"name": "faculty",
"displayName": "Faculty Theme",
"version": "1.0.0",
"type": "theme",

"blocks": [
{
"type": "faculty.video-hero",
"label": "Video Hero",
"category": "Hero",
"extends": "core.hero"
},
{
"type": "faculty.academic-search",
"label": "Academic Search",
"category": "Content"
}
],

"layouts": [
"default",
"homepage",
"article"
]
}

Joy:

{
"name": "joy",
"displayName": "Joy Theme",
"version": "1.0.0",

"blocks": [
{
"type": "joy.image-hero",
"label": "Image Hero",
"category": "Hero",
"extends": "core.hero"
},
{
"type": "joy.mega-menu",
"label": "Mega Menu",
"category": "Navigation"
}
]
} 7. Block Schema

Setiap block harus mempunyai schema.

Contoh:

{
"type": "faculty.video-hero",
"schema": {
"title": {
"type": "string"
},
"subtitle": {
"type": "string"
},
"video": {
"type": "media"
},
"overlay": {
"type": "boolean"
}
}
}

Builder menggunakan schema tersebut untuk menghasilkan form editor.

Dengan demikian builder tidak perlu mengetahui implementasi Svelte.

8. Page Data Structure

Page disimpan sebagai structured content.

Contoh:

{
"id": "home",
"type": "page",
"slug": "/",
"status": "published",

"blocks": [
{
"id": "hero-1",
"type": "faculty.video-hero",
"props": {
"title": "Fakultas Kesehatan Masyarakat",
"subtitle": "Universitas Jember",
"video": "media://hero.mp4"
}
},
{
"id": "search-1",
"type": "core.search",
"props": {
"placeholder": "Cari informasi..."
}
},
{
"id": "news-1",
"type": "core.news",
"props": {
"limit": 6
}
}
]
} 9. Block Registry

CMS menyediakan registry:

BlockRegistry

yang mengetahui seluruh block yang tersedia.

Contoh:

Core
├── core.hero
├── core.text
├── core.image
├── core.video
└── core.news

Faculty
├── faculty.video-hero
└── faculty.academic-search

Joy
├── joy.image-hero
└── joy.mega-menu

Registry digunakan oleh:

Page Builder
Preview
Renderer
Validation
Theme compatibility checker 10. Page Builder

Page Builder harus membaca block dari registry.

Ketika Faculty aktif:

Add Block

Hero
├── Core Hero
└── Faculty Video Hero

Content
├── Text
├── Image
├── News
└── Academic Search

Ketika Joy aktif:

Add Block

Hero
├── Core Hero
└── Joy Image Hero

Navigation
└── Mega Menu

Content
├── Text
├── Image
├── News
└── Events

Tidak diperlukan perubahan source code Page Builder.

11. Theme Switching

Admin dapat mengganti theme:

Settings
↓
Appearance
↓
Theme
↓
Faculty
↓
Joy

CMS kemudian melakukan compatibility check.

Contoh:

Current Page

✓ core.news
✓ core.search
⚠ faculty.video-hero
✓ core.text

Karena Joy tidak mendukung:

faculty.video-hero

maka builder menampilkan warning.

12. Unsupported Block

Block tidak boleh langsung dihapus.

UI:

┌─────────────────────────────────────┐
│ ⚠ Unsupported Block │
│ │
│ Faculty Video Hero │
│ Tidak didukung oleh Joy Theme │
│ │
│ [Keep] [Convert] [Replace] [Delete] │
└─────────────────────────────────────┘
Keep

Block tetap disimpan.

Convert

Mengubah block ke compatible block.

Contoh:

faculty.video-hero
↓
joy.image-hero
Replace

Admin memilih block lain.

Delete

Block dihapus setelah confirmation.

13. Block Fallback

Theme block dapat memiliki fallback.

Contoh:

{
"type": "faculty.video-hero",
"extends": "core.hero",
"fallback": "core.hero"
}

Jika theme tidak mendukung block tersebut:

faculty.video-hero
↓
fallback
↓
core.hero

Dengan demikian content tetap dapat ditampilkan.

14. Preview Architecture

Preview tidak boleh dirender menggunakan komponen dummy Page Builder.

Preview harus menggunakan:

Page JSON
↓
Active Theme
↓
Theme Renderer
↓
Preview HTML

Contoh:

/admin/builder/pages/home
│
▼
Page Builder
│
▼
Save Draft
│
▼
/preview/pages/home
│
▼
Theme Renderer 15. Live Preview

Dashboard Svelte menggunakan iframe.

┌───────────────────────────────────────────────┐
│ Page Builder │
├───────────────┬───────────────────────────────┤
│ Blocks │ Preview │
│ │ │
│ Video Hero │ ┌───────────────────────────┐ │
│ Search │ │ │ │
│ News │ │ FACULTY WEBSITE │ │
│ Events │ │ │ │
│ │ │ Video Hero │ │
│ │ │ Search │ │
│ │ │ News │ │
│ │ └───────────────────────────┘ │
└───────────────┴───────────────────────────────┘

Iframe:

/preview/pages/{pageId}

Preview menggunakan draft version.

16. Draft dan Published Version

Page harus mendukung versioning.

Page
│
├── Draft
│
└── Published

Builder mengedit:

Draft

Preview:

Draft + Active Theme

Website production:

Published + Active Theme

Sehingga perubahan builder tidak langsung merusak website production.

17. Theme Renderer

Theme mempunyai renderer:

ThemeRenderer

Contoh:

faculty.video-hero
↓
VideoHero.svelte

core.news
↓
NewsGrid.svelte

Joy:

joy.image-hero
↓
ImageHero.svelte

core.news
↓
NewsGrid.svelte

Satu block type dapat memiliki renderer berbeda jika diperlukan.

18. Layout System

Theme tidak hanya mendefinisikan block.

Theme juga dapat mendefinisikan layout.

Contoh:

Faculty
├── default
├── homepage
├── article
└── listing

Joy:

Joy
├── default
├── homepage
├── article
└── landing

Page dapat menentukan:

{
"layout": "homepage"
}

Theme kemudian memilih layout tersebut.

19. Homepage

Homepage tetap merupakan Page CMS.

Contoh:

Pages
├── Homepage
├── About
├── Contact
├── News
└── Academic

Homepage:

slug = /

Theme hanya menentukan bagaimana homepage tersebut dirender.

20. Navigation dan Mega Menu

Navigation sebaiknya tidak menjadi content block biasa.

Data menu disimpan sebagai resource CMS:

Menus
├── Main Menu
├── Footer Menu
├── Mobile Menu
└── Mega Menu

Theme dapat meminta:

menu("main")

atau:

menu("mega")

Sehingga Joy dapat memiliki Mega Menu tanpa membuat struktur menu menjadi hardcoded di page.

21. API

NestJS menyediakan endpoint:

GET /api/pages/{slug}
GET /api/pages/{id}
GET /api/pages/{id}/draft
GET /api/pages/{id}/preview

GET /api/themes
GET /api/themes/{theme}
GET /api/themes/{theme}/blocks

GET /api/blocks
GET /api/blocks/{type}

POST /api/pages
PUT /api/pages/{id}
POST /api/pages/{id}/publish 22. Preview API

Endpoint:

GET /preview/pages/{pageId}

Request:

pageId
theme
version
previewToken

Contoh:

/preview/pages/home?theme=faculty&version=draft

Preview server kemudian melakukan:

Page
↓
Block Resolver
↓
Theme Resolver
↓
Svelte Renderer
↓
HTML 23. Security Preview

Preview wajib menggunakan token.

Contoh:

/preview/pages/home?token=xxxxx

Token harus:

memiliki expiration;
hanya berlaku untuk preview;
tidak dapat digunakan untuk API lain;
dapat dicabut;
tidak memberikan akses authentication user. 24. UX Page Builder
Block Picker
Add Block
├── Basic
│ ├── Text
│ ├── Image
│ └── Button
│
├── Media
│ ├── Video
│ └── Gallery
│
├── Content
│ ├── News
│ └── Events
│
└── Faculty
├── Video Hero
└── Academic Search

Category theme harus otomatis muncul berdasarkan active theme.

25. Theme Compatibility Checker

Sebelum theme diaktifkan:

Theme Compatibility

Pages scanned: 24

✓ 21 pages compatible
⚠ 3 pages contain unsupported blocks

Affected:

- Homepage
- Academic
- Landing

Admin dapat melihat detail block yang bermasalah.

26. Theme Installation

Ketika theme diinstall:

Theme Package
↓
Manifest validation
↓
Block validation
↓
Schema validation
↓
Renderer validation
↓
Register Theme

Theme tidak boleh aktif jika manifest invalid.

27. Developer SDK

SDK menyediakan API:

defineTheme({
name: 'faculty',

blocks: [
defineBlock({
type: 'faculty.video-hero',
schema: {},
component: VideoHero
})
]
})

Sehingga developer theme tidak perlu mengubah source code CMS.

28. Acceptance Criteria
    Theme
    Theme dapat mendeklarasikan block melalui manifest.
    Theme dapat mendeklarasikan layout.
    Theme dapat mendefinisikan fallback.
    Theme dapat mempunyai custom block.
    Page Builder
    Builder membaca block dari registry.
    Builder hanya menampilkan block yang tersedia.
    Builder mendukung Core Block.
    Builder mendukung Theme Block.
    Builder tidak bergantung pada implementation Svelte.
    Preview
    Preview menggunakan active theme.
    Preview menggunakan draft.
    Preview dapat dibuka melalui iframe.
    Preview menghasilkan tampilan yang sama dengan renderer production.
    Preview mempunyai authentication/token.
    Theme Switching
    CMS melakukan compatibility check.
    Unsupported block tidak langsung dihapus.
    Admin dapat replace block.
    Admin dapat convert block.
    Fallback block dapat digunakan.
    Content
    Page tetap tersimpan sebagai structured data.
    Content tidak hilang ketika theme diganti.
    Published content terpisah dari draft.
    Page dapat dirender oleh lebih dari satu theme.
29. Prioritas Implementasi
    Phase 1 — Core Foundation
    Theme Manifest
    Block Registry
    Core Blocks
    Theme Blocks
    Page JSON
    Phase 2 — Builder
    Dynamic Block Picker
    Block Schema
    Block Editor
    Drag & Drop
    Draft
    Phase 3 — Theme Renderer
    Theme Resolver
    Block Renderer
    Layout Resolver
    Phase 4 — Preview
    Preview API
    Preview Token
    Iframe Preview
    Live Preview
    Phase 5 — Compatibility
    Theme Switch Checker
    Unsupported Block
    Fallback
    Convert Block
    Phase 6 — SDK
    defineTheme()
    defineBlock()
    defineLayout()
    registerBlock()
30. Arsitektur Akhir UNEJ CMS
    ┌─────────────────────┐
    │ NGINX │
    │ cms.unej.ac.id │
    └──────────┬──────────┘
    │
    ┌───────────────────┼──────────────────┐
    │ │ │
    ▼ ▼ ▼
    /api /admin /preview
    │ │ │
    ▼ ▼ ▼
    NestJS Svelte Static Builder
    │ │
    │ │
    └──────────────────┬───────────────────┘
    │
    ▼
    Theme Engine
    │
    ┌─────────────┼─────────────┐
    ▼ ▼ ▼
    Faculty Joy Custom
    │ │ │
    └─────────────┼─────────────┘
    ▼
    Page Renderer
    │
    ▼
    HTML / SSR
    Prinsip akhir

CMS mengelola:

Content
Pages
Blocks
Media
Menus
Draft
Published
Version

Theme mengelola:

Design
Layout
Svelte Components
Theme Blocks
Theme-specific Presentation

Builder mengelola:

Editing
Block selection
Block configuration
Ordering
Preview

Dengan desain ini, ketika nanti kamu membuat Theme Government, Theme Faculty, Theme School, Theme Library, atau Theme Joy, kamu tidak perlu membongkar Page Builder. Cukup buat theme + manifest + block renderer-nya.
