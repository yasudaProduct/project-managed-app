import pino, { Logger } from 'pino'
import { AsyncLocalStorage } from 'async_hooks'

export type RequestContext = {
    requestId?: string
    userId?: string
}

// リクエストごとのコンテキスト保持
export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>()

// 環境ごとの出力設定
const isProd = process.env.NODE_ENV === 'production'
const level = process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug')

// Next.js RSC/Edge 環境での互換性を優先し、transportを使わず標準出力へ

const baseLogger: Logger = pino(
    {
        level,
        messageKey: 'message',
        formatters: {
            // ログにリクエストIDなどの文脈を自動付与
            log(object) {
                const store = asyncLocalStorage.getStore()
                return store ? { ...object, requestId: store.requestId, userId: store.userId } : object
            },
            level(label, number) {
                return { level: label, levelNumber: number }
            },
        },
        redact: {
            // 機密情報の誤出力を防止
            paths: [
                'password',
                'params.password',
                'body.password',
                'headers.authorization',
                'config.headers.Authorization',
                'data.token',
            ],
            censor: '[Redacted]'
        },
    }
)

export default baseLogger


