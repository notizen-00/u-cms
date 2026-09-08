FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate


# =========================================================
# BUILD
# =========================================================
FROM base AS build

# Root workspace metadata
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Dashboard package
COPY apps/dashboard/package.json ./apps/dashboard/package.json

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build dashboard
RUN pnpm --filter ./apps/dashboard build

# Verify SvelteKit output
RUN test -f /app/apps/dashboard/build/index.js


# =========================================================
# RUNTIME
# =========================================================
FROM base AS runtime

# Copy workspace metadata
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy dashboard package.json
COPY apps/dashboard/package.json ./apps/dashboard/package.json

# Install production dependencies
RUN pnpm install \
    --frozen-lockfile \
    --prod \
    --filter ./apps/dashboard...

# Copy build output
COPY --from=build /app/apps/dashboard/build ./build

# IMPORTANT:
# clsx must be available from the runtime root
RUN node -e "import('clsx').then(() => console.log('clsx OK')).catch(err => { console.error(err); process.exit(1) })"

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "build"]