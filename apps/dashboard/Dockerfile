FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate


# =========================
# Dependencies
# =========================
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/package.json

RUN pnpm install --frozen-lockfile


# =========================
# Build
# =========================
FROM deps AS build

COPY . .

RUN pnpm --filter ./apps/dashboard build


# =========================
# Runtime
# =========================
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/package.json

RUN pnpm install \
    --frozen-lockfile \
    --prod \
    --filter ./apps/dashboard...

# Hasil build dashboard:
# /app/apps/dashboard/build
COPY --from=build /app/apps/dashboard/build ./build

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "build/index.js"]