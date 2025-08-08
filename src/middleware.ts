import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// 注意: Edge Middleware では AsyncLocalStorage は使用しない

// Next.js Middleware は Edge Runtime で動作します。
// AsyncLocalStorage はNode専用APIのため、ここではリクエストIDの生成と付与のみを行い、
// サーバーハンドラ内（Nodeランタイム）でrun()するのが安全です。

export function middleware(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') ?? cryptoRandomUUID()
    const response = NextResponse.next()
    response.headers.set('x-request-id', requestId)
    return response
}

export const config = {
    matcher: ['/api/:path*'],
}

// Edge Runtime でcrypto.randomUUID 相当
function cryptoRandomUUID(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return (crypto as unknown as { randomUUID: () => string }).randomUUID()
    }
    // フォールバック（ほぼ通らない想定）
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}


