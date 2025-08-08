import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IAuthApplicationService } from "@/applications/auth/auth-application-service";
import logger from '@/lib/logger'
import { withRequestContext } from '@/lib/api-handler'

export const GET = withRequestContext(async function GET(request: NextRequest) {
    try {
        const authService = container.get<IAuthApplicationService>(SYMBOL.IAuthApplicationService);

        // Cookieからセッショントークンを取得
        const sessionToken = request.cookies.get("session_token");

        if (!sessionToken) {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        const user = await authService.getCurrentUser(sessionToken.value);

        if (!user) {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
            }
        });
    } catch (error) {
        logger.error({ err: error }, "Auth me error");
        return NextResponse.json({ user: null }, { status: 200 });
    }
})