import { Prisma, PrismaClient } from "@prisma/client";
import { format } from "date-fns";

const prismaClientSingleton = () => {
    const prisma = new PrismaClient({
        log: [ // https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging
            // {
            //     emit: 'stdout',
            //     level: 'query',
            // },
            {
                emit: 'stdout',
                level: 'info',
            },
            {
                emit: 'stdout',
                level: 'warn',
            },
            {
                emit: 'stdout',
                level: 'error',
            },
        ],
    })
        .$extends(prismaWithQueryLogging)
        .$extends(prismaQueryWithTimeMod)

    return prisma;
};


// クエリ実行時間のロギング
const prismaWithQueryLogging = Prisma.defineExtension({
    name: 'prismaWithQueryLogging',
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const start = process.hrtime.bigint();
                console.log(`[Prisma] ${model}.${operation}`);
                try {
                    const result = await query(args);
                    return result;
                } finally {
                    const end = process.hrtime.bigint();
                    const durationMs = Number(end - start) / 1_000_000;
                    console.log(`[Prisma] ${model}.${operation}:${durationMs.toFixed(2)} ms`);
                }
            },
        },
    },
})

const isDateObject = (v: unknown): v is Date =>
    Object.prototype.toString.call(v) === '[object Date]';
const isAtField = (key: string) => /At$/.test(key);

/**
 * クエリ実行時にPostgresのDateカラムに対して日本標準時に変換
 * @description
 * Prismaは日付をUTCで保存・取得するため、タイムゾーンの違いによって日付がずれる問題がある。(https://github.com/prisma/prisma/issues/5051#issuecomment-878106427)
 * JST（2025-09-22 00:00:00 UTC+9）で値をもつDate型をprismaで保存すると、UTC（2025-09-21 15:00:00）で保存される。
 * 特に「日付のみ」を扱う場合、日付が変わってしまう。
 * このため、クエリ実行時に日本標準時に変換する。
 */
const prismaQueryWithTimeMod = Prisma.defineExtension({
    name: 'prismaQueryWithTimeMod',
    query: {
        $allModels: {
            async $allOperations({ operation, args, query }) {

                // create/update操作時に日付型のフィールドを処理
                if ((operation === 'create' || operation === 'update' || operation === 'upsert' || operation === 'createMany' || operation === 'updateMany')) {
                    // argsが存在し、dataプロパティを持っている場合
                    if (args && typeof args === 'object' && 'data' in args) {
                        const data = args.data as Record<string, unknown>;

                        // 日付型のフィールドが存在する場合、prismaTimeModで処理
                        const dateFields = Object.keys(data).filter((key) => {
                            const value = data[key];
                            // TODO: createManyの時にうまく動作していない？？
                            if (operation === 'createMany') {
                                console.log('---------------------------------')
                                console.log(`[Prisma] Checking field: ${key} with value: ${value}  ${Object.prototype.toString.call(value)}`);
                                console.log(`[Prisma] isDateObject(value): ${isDateObject(value)} && !isAtField(key): ${!isAtField(key)}`);
                            }
                            return isDateObject(value) && !isAtField(key);
                        });
                        console.log(`[Prisma] dateFields: ${dateFields}`);
                        dateFields.forEach((field) => {
                            const value = (data as Record<string, unknown>)[field];
                            const normalized = new Date(format(value as Date, 'yyyy-MM-dd'));
                            (data as Record<string, unknown>)[field] = normalized;
                        });
                        if (dateFields.length > 0) {
                            console.log(`[Prisma] prismaQueryWithTimeMod: ${dateFields}`);
                        }
                    }
                }
                const result = await query(args);

                return result;
            }
        }
    }
})

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

// HMR対応のため、globalForPrisma.prismaが存在する場合はそれを使用する
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;