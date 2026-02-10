# ベースイメージ
FROM node:22-alpine AS base

# 依存関係インストール
FROM base AS deps
WORKDIR /app

# package.json と package-lock.json のみをコピー（キャッシュ効率化）
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# 開発依存関係を含めた全依存関係のインストール
FROM base AS deps-full
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Prisma 生成専用ステージ
FROM deps-full AS prisma-gen
WORKDIR /app
COPY prisma ./prisma/
RUN npx prisma generate --schema=./prisma/schema.prisma && \
    npx prisma generate --schema=./prisma/schema.mysql.prisma


# ビルドステージ
FROM deps-full AS builder
WORKDIR /app
COPY . .
COPY --from=prisma-gen /app/node_modules/.prisma ./node_modules/.prisma

# .svn ディレクトリの削除（ビルド時のみ）
RUN find . -name ".svn" -type d -exec rm -rf {} + 2>/dev/null || true

# マイグレーションとビルド
RUN set -a && \
    [ -f .env.development ] && . ./.env.development && \
    set +a && \
    npx prisma migrate deploy --schema=./prisma/schema.prisma && \
    npm run build


# 実行ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=development
ENV TZ=Asia/Tokyo

# 非rootユーザーの作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 本番依存関係のみをコピー
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma Clientをコピー
COPY --from=prisma-gen --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# アプリケーションファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --chown=nextjs:nodejs package.json ./

# USER nextjs

EXPOSE 3000

CMD ["npm", "run", "dev"]