import { PrismaClient } from '.prisma/geppo-client'

declare global {
  // eslint-disable-next-line no-var
  var __geppo_prisma: PrismaClient | undefined
}

// Geppo専用のPrismaクライアント（MySQLデータベース用）
export const geppoPrisma = 
  globalThis.__geppo_prisma ?? 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: process.env.GEPPO_DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__geppo_prisma = geppoPrisma
}