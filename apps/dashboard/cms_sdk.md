RD
UNEJ CMS Plugin SDK
Product Requirements Document

Version: 1.0

Status: Draft

1. Overview

Plugin SDK adalah Software Development Kit resmi yang digunakan untuk mengembangkan plugin pada UNEJ CMS.

Plugin SDK menyediakan kontrak, registry, helper, lifecycle, validasi, dan API sehingga plugin dapat berjalan pada seluruh ekosistem UNEJ CMS tanpa bergantung langsung pada implementasi internal NestJS maupun SvelteKit.

Plugin SDK bukan runtime, melainkan Developer API.

2. Goals

Plugin SDK harus mampu:

✅ Menjadi kontrak resmi antara Core CMS dan Plugin

✅ Menyediakan API yang stabil

✅ Mendukung backward compatibility

✅ Mendukung versioning

✅ Memudahkan developer membuat plugin

✅ Mengisolasi plugin dari implementasi Core

✅ Mendukung Marketplace di masa depan

3. Non Goals

Plugin SDK bukan:

Runtime Plugin
Plugin Manager
Plugin Marketplace
Theme Builder
Dashboard Builder
Backend Framework

Plugin SDK hanya menyediakan kontrak.

4.  Architecture
    UNEJ CMS

                 +-----------------------+
                 |      Plugin SDK       |
                 +-----------+-----------+

          +-----------------+-----------------+

          |                 |                 |

    Backend SDK Dashboard SDK Builder SDK

          |                 |                 |

    NestJS SvelteKit SvelteKit

          \                 |                 /

           \                |                /

                  Plugin Implementation

5.  SDK Principles

Plugin SDK harus:

Framework Agnostic
Type Safe
Strongly Typed
Versioned
Backward Compatible
Declarative
Extensible 6. Technology

Language

TypeScript

Runtime

None

Framework

None

Target

NodeJS

Browser

ESM

7. Monorepo Structure
   packages/

plugin-sdk/

src/

backend/

builder/

dashboard/

common/

manifest/

registry/

utils/

package.json

tsconfig.json 8. Public API

Plugin SDK hanya memiliki public API.

Contoh

definePlugin()

PluginManifest

BackendContext

DashboardContext

BuilderContext

LifecycleContext

Developer tidak boleh mengakses internal SDK.

9. Package Structure
   plugin-sdk/

src/

backend.ts

builder.ts

dashboard.ts

manifest.ts

plugin.ts

registry.ts

types.ts

index.ts 10. Manifest

SDK menyediakan Plugin Manifest.

Manifest wajib memiliki:

Plugin ID

Name

Version

Author

Description

Compatibility

Dependencies

Capabilities

License

Homepage

Repository

11. Compatibility

Plugin wajib menentukan

Minimum CMS Version

Maximum CMS Version

Minimum SDK Version

Maximum SDK Version

SDK akan memvalidasi.

12. Lifecycle

Plugin memiliki lifecycle.

Install

Activate

Running

Deactivate

Uninstall

Upgrade

Downgrade

13. Plugin Interface

SDK menyediakan

CmsPlugin

Plugin wajib mengimplementasikan interface tersebut.

14. Backend Context

Backend Context menyediakan API untuk

Permission

Route

Settings

Queue

Cron

Event

Migration

Storage

Logger

15. Dashboard Context

Dashboard Context menyediakan

Menu

Pages

Widgets

Toolbar

Command Palette

Settings

Inspector

16. Builder Context

Builder menyediakan

Blocks

Actions

Triggers

Slots

Assets

Theme Extension

Renderer Extension

17. Registry

SDK menyediakan Registry Interface.

Registry

Plugin Registry

Block Registry

Widget Registry

Action Registry

Trigger Registry

Permission Registry

18. Builder SDK

Builder SDK menyediakan

Block Definition

Action Definition

Trigger Definition

Slot Definition

Property Schema

19. Dashboard SDK

Dashboard SDK menyediakan

Menu Definition

Widget Definition

Page Definition

Setting Definition

Inspector Definition

20. Backend SDK

Backend SDK menyediakan

Route Definition

Permission Definition

Cron Definition

Queue Definition

Migration Definition

Storage Definition

21. Shared Types

SDK menyediakan

JsonValue

PluginID

SiteID

PermissionKey

BlockID

ThemeID

AssetID

MediaID

EventID

22. Validation

SDK memvalidasi

Plugin Manifest

Version

Dependency

Schema

Settings

Capabilities

23. Plugin Loader

SDK menyediakan helper

Plugin Discovery

Plugin Metadata

Plugin Validation

Plugin Registration

24. Declarative Registration

Plugin tidak memanggil Core secara langsung.

Plugin cukup mendeklarasikan.

Contoh

Backend

Dashboard

Builder

25. Runtime Contract

Runtime wajib menyediakan

BackendContext

DashboardContext

BuilderContext

Plugin tidak boleh mengetahui implementasi Runtime.

26. Security

Plugin tidak boleh

Mengakses Database langsung

Mengakses FileSystem langsung

Mengakses Internal Container

Menjalankan Arbitrary Code

Mengubah Theme

Mengubah Core

Semua akses harus melalui SDK.

27. Event System

SDK menyediakan Event.

Plugin dapat

Listen

Dispatch

Subscribe

Unsubscribe

28. Logger

SDK menyediakan

Debug

Info

Warn

Error

Plugin tidak boleh menggunakan console secara langsung.

29. Storage

Plugin hanya mengenal

Storage Driver

Bukan Local File

Bukan S3

Bukan MinIO

Runtime menentukan implementasi.

30. Assets

Plugin dapat mendaftarkan

CSS

Javascript

Fonts

Icons

Images

Builder akan memuat otomatis.

31. Internationalization

SDK menyediakan

Translation

Locale

Pluralization

Namespace

32. Testing

SDK menyediakan

Plugin Test Harness

Mock Context

Mock Builder

Mock Backend

Mock Dashboard

33. CLI

SDK menyediakan CLI

pnpm plugin:create

pnpm plugin:build

pnpm plugin:test

pnpm plugin:validate

pnpm plugin:publish 34. Marketplace Ready

Plugin SDK harus mendukung

Marketplace

License

Payment

Auto Update

Digital Signature

Checksum

Dependency Resolution

35. Future

AI Plugin

Remote Plugin

Cloud Plugin

Plugin Analytics

Plugin Metrics

Plugin Crash Report

Roadmap
v1
Plugin Manifest
Plugin Interface
Backend SDK
Dashboard SDK
Builder SDK
Registry
Validation
Logger
v2
Plugin CLI
Plugin Generator
Testing SDK
Event System
Asset Pipeline
v3
Marketplace
Plugin Store
Auto Update
Digital Signature
Dependency Resolver
🎯 Saya menyarankan sedikit perubahan dari konsep sebelumnya

Setelah semua diskusi kita, saya rasa jangan membuat satu package plugin-sdk yang besar.

Buat SDK berlapis, seperti yang dilakukan oleh banyak platform besar.

packages/

sdk/
│
├── core/ ← Wajib untuk semua plugin
│
├── backend/ ← Khusus NestJS
│
├── dashboard/ ← Khusus Dashboard
│
├── builder/ ← Khusus Frontend Builder
│
├── theme/ ← API Theme
│
├── media/ ← Media abstraction
│
├── auth/ ← Permission & User
│
└── testing/ ← Mock & Test Harness

Lalu setiap plugin hanya menginstal SDK yang dibutuhkan.

Misalnya Carousel:

sdk-core
sdk-builder

Sedangkan Form Builder:

sdk-core
sdk-backend
sdk-dashboard
sdk-builder

Keuntungan pendekatan ini:

dependency plugin lebih kecil;
compile lebih cepat;
batas tanggung jawab tiap SDK jelas;
lebih mudah melakukan versioning;
siap untuk marketplace plugin di masa depan.

Menurut saya, model ini jauh lebih scalable dibanding satu package SDK yang terus membesar seiring bertambahnya kemampuan CMS.

oke sekarang buatkan prd barunya

Menurut saya, setelah semua diskusi kita, arsitektur terbaik bukan lagi "Plugin SDK", tetapi CMS Platform SDK.

Alasannya sederhana:

Plugin nantinya bukan satu-satunya yang membutuhkan SDK.

Nanti akan ada:

Plugin
Theme
Dashboard Extension
Builder Extension
AI Extension
Marketplace

Kalau dari awal namanya plugin-sdk, nanti akan membesar dan akhirnya menjadi "God Package".

Saya lebih menyarankan arsitektur seperti VSCode Extension API, Shopify App Bridge, atau Figma Plugin API.

PRD
UNEJ CMS Platform SDK

Version 2.0

Status: Draft

Target: Core Platform

1. Overview

UNEJ CMS Platform SDK adalah sekumpulan package TypeScript yang menjadi kontrak resmi antara Core CMS dengan seluruh Extension Ecosystem.

Platform SDK digunakan oleh:

Plugin
Theme
Builder
Dashboard
Marketplace
AI Extension

SDK tidak memiliki implementasi runtime.

SDK hanya mendefinisikan API, Contract, Type, Registry, dan Helper.

2. Goals

Platform SDK harus:

✅ Menjadi satu-satunya API resmi

✅ Framework Independent

✅ Type Safe

✅ Modular

✅ Tree Shakable

✅ Versioned

✅ Backward Compatible

✅ Marketplace Ready

3. Non Goals

Platform SDK bukan

NestJS Module

Svelte Component Library

Theme Runtime

Plugin Runtime

Marketplace

Database ORM

4.  High Level Architecture
    UNEJ CMS PLATFORM

                    +---------------------------+
                    |      Platform SDK         |
                    +------------+--------------+

         +----------+------------+-------------+-----------+

         |          |            |             |           |

    Core SDK Backend SDK Dashboard SDK Builder SDK Theme SDK

         |          |            |             |           |

         |          |            |             |           |

    Plugins NestJS Dashboard Builder Themes

5.  Repository Structure
    unej-cms/

apps/

backend/

dashboard/

builder/

packages/

sdk/

core/

backend/

dashboard/

builder/

theme/

media/

auth/

testing/

plugins/

themes/ 6. SDK Packages
sdk-core

Digunakan SEMUA extension.

Berisi:

Plugin Manifest

Plugin Interface

Version

Compatibility

Logger Interface

Shared Types

Events

Utilities

Validation

sdk-backend

Digunakan backend plugin.

Berisi:

Backend Context

Route Definition

Permission Definition

Cron

Queue

Migration

Settings

Storage Contract

sdk-dashboard

Digunakan Dashboard Extension.

Berisi:

Menu

Page

Widget

Toolbar

Command

Inspector

Settings

sdk-builder

Digunakan Builder.

Berisi:

Blocks

Slots

Actions

Triggers

Renderer

Property Schema

Asset Definition

sdk-theme

Digunakan Theme.

Berisi:

Theme Manifest

Theme Settings

Layout Definition

Region Definition

Theme Assets

sdk-media

Berisi

Media Model

Media Transformation

Image Definition

Storage Driver

sdk-auth

Berisi

Permission

Role

Capability

Guard

Policy

sdk-testing

Berisi

Mock Context

Fake Registry

Plugin Harness

Builder Harness

Dashboard Harness

7.  Dependency Diagram
    sdk-core

        ▲        ▲        ▲

        │        │        │

sdk-backend sdk-dashboard sdk-builder

        ▲        ▲        ▲

        │        │        │

     Plugins   Dashboard Builder

Semua package bergantung ke

sdk-core

Tetapi

sdk-backend

tidak bergantung ke

sdk-builder.

8. SDK Principles

Single Responsibility

Dependency Inversion

Interface First

Declarative

Immutable Contract

Runtime Independent

9. Public API

SDK hanya memiliki Public API.

Developer tidak boleh mengakses Internal API.

10. Plugin Definition

Plugin menggunakan

sdk-core

definePlugin() 11. Backend Definition

Plugin backend menggunakan

sdk-backend

defineBackend() 12. Dashboard Definition

Plugin dashboard menggunakan

sdk-dashboard

defineDashboard() 13. Builder Definition

Plugin frontend menggunakan

sdk-builder

defineBuilder() 14. Theme Definition

Theme menggunakan

sdk-theme

defineTheme() 15. Theme API

Theme hanya boleh

Register Region

Register Layout

Register Assets

Register Theme Settings

Tidak boleh mengakses Database.

16. Plugin API

Plugin boleh

Register Block

Register Widget

Register Route

Register Action

Register Trigger

Register Permission

17. Registry System

Platform memiliki Registry.

Plugin Registry

Theme Registry

Widget Registry

Block Registry

Renderer Registry

Action Registry

Trigger Registry

18. Runtime

Runtime diimplementasikan oleh

Backend

Dashboard

Builder

SDK tidak memiliki Runtime.

19. Backend Runtime

Backend mengimplementasikan

Backend Context

Storage

Permission

Queue

Logger

20. Dashboard Runtime

Dashboard mengimplementasikan

Menu

Widget

Command

Inspector

21. Builder Runtime

Builder mengimplementasikan

Renderer

Blocks

Slots

Triggers

Actions

22. Theme Runtime

Builder mengimplementasikan

Theme Loader

Theme Assets

Theme Settings

Theme Regions

23. Context

Backend Context

Dashboard Context

Builder Context

Theme Context

Storage Context

Logger Context

24. Manifest

Plugin Manifest

Theme Manifest

Marketplace Manifest

25. Versioning

SemVer

SDK Version

CMS Version

Plugin Version

Theme Version

26. Compatibility

SDK memvalidasi

Plugin

Theme

CMS

27. Security

Plugin tidak boleh

akses filesystem

akses database

akses container

akses runtime internal

Semua melalui SDK.

28. Asset Pipeline

Plugin dapat register

CSS

Javascript

Fonts

Icons

Images

Builder akan mengelola Asset Pipeline.

29. Event System

SDK menyediakan

Event

Hook

Dispatch

Subscribe

30. Logger

SDK menyediakan

Debug

Info

Warn

Error

Trace

31. Testing

Testing SDK menyediakan

Mock Runtime

Fake Registry

Plugin Test

Builder Test

32. CLI

Platform SDK menyediakan

create-plugin

create-theme

build-plugin

build-theme

validate-plugin

validate-theme

33. Marketplace Ready

SDK harus mendukung

Digital Signature

Plugin License

Auto Update

Dependency

Checksum

Integrity

34. Roadmap
    v1

Core SDK

Backend SDK

Dashboard SDK

Builder SDK

Theme SDK

Manifest

Registry

Validation

v2

Media SDK

Testing SDK

CLI

Asset Pipeline

v3

Marketplace

Remote Plugin

Theme Marketplace

Plugin Analytics

Cloud Sync

📌 Rekomendasi Arsitektur Akhir (yang saya pilih)

Setelah melihat keseluruhan visi CMS-mu (NestJS + SvelteKit + Theme + Builder + Plugin + Marketplace), saya akan mengubah satu hal lagi.

Daripada membuat SDK berdasarkan aplikasi (sdk-backend, sdk-builder, dll.), saya akan membuat SDK berdasarkan domain.

Strukturnya menjadi:

packages/sdk/

├── core/ ← manifest, lifecycle, registry
├── content/ ← post, page, taxonomy
├── media/ ← media & image
├── ui/ ← block, widget, action
├── auth/ ← permission & role
├── storage/ ← filesystem abstraction
├── events/ ← event bus
├── theme/ ← theme contract
├── plugin/ ← plugin lifecycle
└── testing/ ← mock & harness

Lalu:

Backend mengimplementasikan SDK tersebut.
Dashboard mengimplementasikan SDK tersebut.
Builder mengimplementasikan SDK tersebut.

Dengan pendekatan berbasis domain, SDK tidak lagi bergantung pada apakah kode berjalan di backend atau frontend. Ia hanya mendefinisikan kemampuan bisnis (content, media, auth, theme, UI, events). Ini akan membuat platform jauh lebih fleksibel dan lebih mudah berkembang ketika suatu saat kamu menambahkan mobile app, CLI, AI worker, atau layanan lain yang juga membutuhkan kontrak yang sama.
