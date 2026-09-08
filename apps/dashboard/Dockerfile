FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .

RUN pnpm build

# pastikan output memang ada
RUN test -d /app/build

FROM base AS runtime

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/build ./build

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "build/index.js"]