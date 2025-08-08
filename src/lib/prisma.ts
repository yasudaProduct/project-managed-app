import { PrismaClient } from "@prisma/client";
import logger from '@/lib/logger'

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
        ],
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Prisma のイベントを Pino にブリッジ
// 注意: クライアント生成後にリスナーを設定
prisma.$on('query', (e: { query: string; params: string; duration: number; target: string }) => {
    // e: { query, params, duration, target }
    logger.debug({ query: e.query, params: safeJson(e.params), durationMs: e.duration }, 'Prisma query')
})
prisma.$on('info', (e: { message: string; target: string }) => {
    logger.info({ message: e.message, target: e.target }, 'Prisma info')
})
prisma.$on('warn', (e: { message: string; target: string }) => {
    logger.warn({ message: e.message, target: e.target }, 'Prisma warn')
})
prisma.$on('error', (e: { message: string; target: string }) => {
    logger.error({ message: e.message, target: e.target }, 'Prisma error')
})

function safeJson(text: string) {
    try { return JSON.parse(text) } catch { return text }
}