"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IAuthApplicationService, LoginRequest, RegisterRequest } from "@/applications/auth/auth-application-service";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
    const authService = container.get<IAuthApplicationService>(SYMBOL.IAuthApplicationService);

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email) {
        return { success: false, error: "メールアドレスを入力してください" };
    }

    const request: LoginRequest = {
        email,
        password: password || undefined
    };

    const result = await authService.login(request);

    if (result.success && result.session) {
        console.log("loginAction result", result);
        // セッションをCookieに保存
        const cookieStore = await cookies();
        cookieStore.set("session_token", result.session.token, {
            expires: result.session.expiresAt,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        // Don't redirect here - let the client handle the redirect
        // redirect("/dashboard");
    }

    return {
        success: result.success,
        user: result.user ? {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            displayName: result.user.displayName,
            createdAt: result.user.createdAt?.toISOString(),
            updatedAt: result.user.updatedAt?.toISOString()
        } : undefined,
        session: result.session ? {
            id: result.session.id,
            userId: result.session.userId,
            token: result.session.token,
            expiresAt: result.session.expiresAt.toISOString(),
            createdAt: result.session.createdAt?.toISOString(),
            updatedAt: result.session.updatedAt?.toISOString()
        } : undefined,
        error: result.error
    };
}

export async function registerAction(formData: FormData) {
    const authService = container.get<IAuthApplicationService>(SYMBOL.IAuthApplicationService);

    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const displayName = formData.get("displayName") as string;
    const password = formData.get("password") as string;

    if (!email || !name || !displayName) {
        return { success: false, error: "すべての必須項目を入力してください" };
    }

    const request: RegisterRequest = {
        email,
        name,
        displayName,
        password: password || undefined
    };

    const result = await authService.register(request);

    if (result.success && result.session) {
        // セッションをCookieに保存
        const cookieStore = await cookies();
        cookieStore.set("session_token", result.session.token, {
            expires: result.session.expiresAt,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        // Don't redirect here - let the client handle the redirect
        // redirect("/dashboard");
    }

    // Convert class instances to plain objects for Client Components
    return {
        success: result.success,
        user: result.user ? {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            displayName: result.user.displayName,
            createdAt: result.user.createdAt?.toISOString(),
            updatedAt: result.user.updatedAt?.toISOString()
        } : undefined,
        session: result.session ? {
            id: result.session.id,
            userId: result.session.userId,
            token: result.session.token,
            expiresAt: result.session.expiresAt.toISOString(),
            createdAt: result.session.createdAt?.toISOString(),
            updatedAt: result.session.updatedAt?.toISOString()
        } : undefined,
        error: result.error
    };
}

export async function logoutAction() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");

    if (sessionToken) {
        const authService = container.get<IAuthApplicationService>(SYMBOL.IAuthApplicationService);
        await authService.logout(sessionToken.value);

        // Cookieから削除
        cookieStore.delete("session_token");
    }

    redirect("/auth/login");
}

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");

    if (!sessionToken) {
        return null;
    }

    const authService = container.get<IAuthApplicationService>(SYMBOL.IAuthApplicationService);
    const user = await authService.getCurrentUser(sessionToken.value);

    if (!user) {
        return null;
    }

    // Convert class instance to plain object for Client Components
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString(),
        updatedAt: user.updatedAt?.toISOString()
    };
}