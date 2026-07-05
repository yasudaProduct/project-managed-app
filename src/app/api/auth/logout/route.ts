import { NextRequest } from "next/server";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IAuthApplicationService } from "@/applications/auth/auth-application-service";
import { cookies } from "next/headers";
import { createApiResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
    try {
        const authService = container.get<IAuthApplicationService>(SYMBOL.IAuthApplicationService);

        // Cookieからセッショントークンを取得
        const sessionToken = request.cookies.get("session_token");

        if (sessionToken) {
            await authService.logout(sessionToken.value);
        }

        // Cookieを削除
        const cookieStore = await cookies();
        cookieStore.delete("session_token");

        return createApiResponse(null);
    } catch (error) {
        console.error("Logout error:", error);

        // エラーが発生してもCookieは削除する
        const cookieStore = await cookies();
        cookieStore.delete("session_token");

        return createApiResponse(null);
    }
}
