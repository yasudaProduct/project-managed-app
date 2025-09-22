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
    // .$extends(prismaResultWithTimeMod);

    return prisma;
};


// クエリ実行時間のロギング
const prismaWithQueryLogging = Prisma.defineExtension({
    name: 'prismaWithQueryLogging',
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const start = process.hrtime.bigint();
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

// NOTE: 以前の拡張で使用していた補助関数。現在は未使用のためコメントアウト。
// function prismaTimeMod(args: Date) {
//     if (args instanceof Date) {
//         const jstString = format(args, 'yyyy-MM-dd')
//         const jstDate = new Date(jstString)
//         return jstDate
//     }
//     return args;
// }

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
            async $allOperations({ model, operation, args, query }) {

                // create/update操作時に日付型のフィールドを処理
                if ((operation === 'create' || operation === 'update')) {
                    // argsが存在し、dataプロパティを持っている場合
                    if (args && typeof args === 'object' && 'data' in args) {
                        const data = args.data;

                        // 日付型のフィールドが存在する場合、prismaTimeModで処理
                        const dateFields = Object.keys(data).filter((key) => {
                            const value = (data as Record<string, unknown>)[key];
                            return Object.prototype.toString.call(value) === '[object Date]';
                        });
                        dateFields.forEach((field) => {
                            const value = (data as Record<string, unknown>)[field];
                            const normalized = new Date(format(value as Date, 'yyyy-MM-dd'));
                            (data as Record<string, unknown>)[field] = normalized;
                        });
                    }
                }
                const result = await query(args);

                // if ((operation === 'findMany' || operation === 'findUnique')) {
                //     console.log('-------------prismaResultWithTimeMod--------------')
                //     console.log(`model.operation: ${model}.${operation}`)
                //     console.log('result:', result);

                //     const dateFields = Object.keys(result as Record<string, unknown>).filter((key) => {
                //         const value = (result as Record<string, unknown>)[key];
                //         return Object.prototype.toString.call(value) === '[object Date]';
                //     });
                //     dateFields.forEach((field) => {
                //         const value = (result as Record<string, unknown>)[field as keyof typeof result];
                //         console.log('Modifying date field:', field, value);
                //         // const normalized = new Date(format(value as Date, 'yyyy-MM-dd'));
                //         // (result as Record<string, unknown>)[field] = normalized;
                //         // console.log('normalized:', field, normalized);
                //     });
                // }

                // debug
                // const timeStampFields = Object.keys(result as Record<string, unknown>).filter((key) => {
                //     const value = (result as Record<string, unknown>)[key];
                //     return Object.prototype.toString.call(value) === '[object Timestamp]';
                // });
                // timeStampFields.forEach((field) => {
                //     const value = (result as Record<string, unknown>)[field as keyof typeof result];
                //     console.log('TimeStamp field:', field, value);
                // });

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