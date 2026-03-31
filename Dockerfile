FROM oven/bun:1.3-alpine

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY src/ src/

RUN mkdir -p /data

ENV MEMORY_STORE_DB_PATH=/data/memory.db

ENTRYPOINT ["bun", "run", "src/index.ts"]
