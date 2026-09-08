FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate


# ==========================================
# Dependencies
# ==========================================
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/package.json

RUN pnpm install --frozen-lockfile


# ==========================================
# Build
# ==========================================
FROM deps AS build

COPY . .

RUN pnpm --filter ./apps/dashboard build

# Cari hasil build dan normalisasi ke /output
RUN set -eux; \
    echo "=== SEARCHING DASHBOARD BUILD OUTPUT ==="; \
    find /app/apps/dashboard -maxdepth 5 -type d | sort; \
    if [ -d "/app/apps/dashboard/build" ]; then \
    echo "FOUND: build"; \
    cp -R /app/apps/dashboard/build /output; \
    elif [ -d "/app/apps/dashboard/dist" ]; then \
    echo "FOUND: dist"; \
    cp -R /app/apps/dashboard/dist /output; \
    elif [ -d "/app/apps/dashboard/.output" ]; then \
    echo "FOUND: .output"; \
    cp -R /app/apps/dashboard/.output /output; \
    else \
    echo "ERROR: Dashboard build output not found"; \
    exit 1; \
    fi


# ==========================================
# Runtime
# ==========================================
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

# Hasil build sudah dinormalisasi oleh build stage
COPY --from=build /output ./build

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "build/index.js"]