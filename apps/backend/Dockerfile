# Build context is the monorepo root (see deploy/docker-compose.yml) — the
# backend depends on workspace packages under packages/sdk/*, plugins/*, and
# themes/* (pnpm `workspace:*`), which an apps/backend-only context can't
# resolve.

FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

FROM base AS build

COPY . .

RUN pnpm install --frozen-lockfile --filter unej-cms...

RUN pnpm --filter unej-cms... run build

FROM base AS runtime

ENV NODE_ENV=production

COPY . .

RUN pnpm install --frozen-lockfile --prod --filter unej-cms...

COPY --from=build /app/packages/sdk /app/packages/sdk
COPY --from=build /app/plugins /app/plugins
COPY --from=build /app/themes /app/themes
COPY --from=build /app/apps/backend/dist /app/apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["sh", "-c", "node dist/database/migrate.js && node dist/main.js"]
