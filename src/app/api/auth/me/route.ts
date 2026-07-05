import { NextRequest } from "next/server";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IAuthApplicationService } from "@/applications/auth/auth-application-service";
import { createApiResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
    try {
        const authService = container.get<IAuthApplicationService>(SYMBOL.IAuthApplicationService);

        // Cookieからセッショントークンを取得
        const sessionToken = request.cookies.get("session_token");

        if (!sessionToken) {
            return createApiResponse({ user: null });
        }

        const user = await authService.getCurrentUser(sessionToken.value);

        if (!user) {
            return createApiResponse({ user: null });
        }

        return createApiResponse({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
            }
        });
    } catch (error) {
        console.error("Auth me error:", error);
        return createApiResponse({ user: null });
    }
}
