# Stage 1: Base
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Stage 2: Install Dependencies
FROM base AS deps

# Copy only package.json files first (layer cache optimization)
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/

RUN bun install --frozen-lockfile

# Stage 3: Production Runner
FROM base AS runner

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source code
COPY . .

EXPOSE 3000

ENV NODE_ENV=production

# Baileys auth session directory (mount via Docker volume)
RUN mkdir -p /app/apps/api/auth_session

CMD ["bun", "run", "apps/api/src/index.ts"]
