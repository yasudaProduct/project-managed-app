import type { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { asyncLocalStorage } from '@/lib/logger'

type RouteContext<TParams extends Record<string, unknown>> = { params: Promise<TParams> }

export function withRequestContext<TParams extends Record<string, unknown>>(
    handler: (request: NextRequest, context: RouteContext<TParams>) => Promise<NextResponse>,
) {
    return async (request: NextRequest, context: RouteContext<TParams>) => {
        const requestId = request.headers.get('x-request-id') ?? randomUUID()

        return asyncLocalStorage.run({ requestId }, async () => {
            const { method, url } = request
            logger.info({ method, url }, 'Request start')
            try {
                const response: NextResponse = await handler(request, context)
                logger.info({ method, url, status: response.status }, 'Request end')
                return response
            } catch (error) {
                logger.error({ method, url, err: error }, 'Unhandled error in route handler')
                throw error
            }
        })
    }
}

function randomUUID(): string {
    // Node.js と Edge の両方を考慮
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return (crypto as unknown as { randomUUID: () => string }).randomUUID()
    }
    // フォールバック
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}


