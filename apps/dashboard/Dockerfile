FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate


# =========================================================
# Dependencies
# =========================================================
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/package.json

RUN pnpm install --frozen-lockfile


# =========================================================
# Build
# =========================================================
FROM deps AS build

COPY . .

RUN pnpm --filter ./apps/dashboard build

# Pastikan hasil SvelteKit benar-benar ada
RUN test -f /app/apps/dashboard/build/index.js


# =========================================================
# Production dependencies
# =========================================================
FROM deps AS prod-deps

# Buang devDependencies setelah semua dependency workspace
# berhasil di-install.
RUN pnpm prune --prod


# =========================================================
# Runtime
# =========================================================
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate

# Ambil node_modules hasil install production
COPY --from=prod-deps /app/node_modules ./node_modules

# Package dashboard
COPY --from=prod-deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules

COPY apps/dashboard/package.json ./package.json

# Hasil build
COPY --from=build /app/apps/dashboard/build ./build

# Verifikasi dependency penting tersedia
RUN node -e "import('clsx').then(() => console.log('clsx OK')).catch(err => { console.error(err); process.exit(1) })"

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "build"]