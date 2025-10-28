import { inject, injectable } from "inversify";
import { AuthService } from "@/domains/auth/auth-service";
import type { IAuthRepository } from "@/applications/auth/iauth-repository";
// import { User } from "@/domains/auth/user";
import { UserSession } from "@/domains/auth/user-session";
import { SYMBOL } from "@/types/symbol";
import { User } from "@/domains/user/user";

export interface LoginRequest {
    email: string;
    password?: string;
}

export interface RegisterRequest {
    email: string;
    name: string;
    displayName: string;
    password?: string;
}

export interface AuthResult {
    success: boolean;
    user?: User;
    session?: UserSession;
    error?: string;
}

export interface IAuthApplicationService {
    login(request: LoginRequest): Promise<AuthResult>;
    logout(sessionToken: string): Promise<{ success: boolean }>;
    validateSession(sessionToken: string): Promise<User | null>;
    getCurrentUser(sessionToken?: string): Promise<User | null>;
}

@injectable()
export class AuthApplicationService implements IAuthApplicationService {
    private authService: AuthService;

    constructor(
        @inject(SYMBOL.IAuthRepository) private authRepository: IAuthRepository
    ) {
        this.authService = new AuthService(authRepository);
    }

    async login(request: LoginRequest): Promise<AuthResult> {
        try {
            const result = await this.authService.login(request.email, request.password);

            if (!result) {
                return {
                    success: false,
                    error: "メールアドレスまたはパスワードが正しくありません"
                };
            }

            return {
                success: true,
                user: result.user,
                session: result.session
            };
        } catch (error) {
            console.error(error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "ログインに失敗しました"
            };
        }
    }

    async logout(sessionToken: string): Promise<{ success: boolean }> {
        try {
            const success = await this.authService.logout(sessionToken);
            return { success };
        } catch {
            return { success: false };
        }
    }

    async validateSession(sessionToken: string): Promise<User | null> {
        try {
            return await this.authService.validateSession(sessionToken);
        } catch {
            return null;
        }
    }

    async getCurrentUser(sessionToken?: string): Promise<User | null> {
        if (!sessionToken) {
            return null;
        }

        return await this.validateSession(sessionToken);
    }

    async cleanupExpiredSessions(): Promise<void> {
        await this.authService.cleanupExpiredSessions();
    }
}