FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm run build:webhook-processor
RUN npx tsc apps/webhook-processor/src/run-migrations.ts apps/webhook-processor/src/data-source.ts \
    --outDir dist-migrations \
    --esModuleInterop --resolveJsonModule --skipLibCheck \
    --module commonjs --target ES2020 --moduleResolution node \
    --experimentalDecorators --emitDecoratorMetadata

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV NATS_SERVERS=nats://nats:4222

RUN corepack enable

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-migrations ./dist-migrations

EXPOSE 3001

CMD ["node", "dist/apps/webhook-processor/main.js"]