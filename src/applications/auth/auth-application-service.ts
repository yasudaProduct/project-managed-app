import { inject, injectable } from "inversify";
import type { IAuthRepository } from "@/applications/auth/iauth-repository";
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
    constructor(
        @inject(SYMBOL.IAuthRepository) private authRepository: IAuthRepository
    ) { }

    async login(request: LoginRequest): Promise<AuthResult> {
        try {
            const result = await this.authenticateAndCreateSession(request.email, request.password);

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
            const session = await this.authRepository.findSessionByToken(sessionToken);
            if (!session) {
                return { success: false };
            }

            await this.authRepository.deleteSession(session.id);
            return { success: true };
        } catch {
            return { success: false };
        }
    }

    async validateSession(sessionToken: string): Promise<User | null> {
        try {
            const session = await this.authRepository.findSessionByToken(sessionToken);
            if (!session || !session.isValid()) {
                return null;
            }

            return await this.authRepository.findUserById(session.userId);
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
        await this.authRepository.deleteExpiredSessions();
    }

    /**
     * メールアドレス・パスワードでユーザーを認証し、成功時はセッションを新規作成する。
     */
    private async authenticateAndCreateSession(
        email: string,
        password?: string
    ): Promise<{ user: User; session: UserSession } | null> {
        const user = await this.authRepository.findUserByEmail(email);
        if (!user) {
            return null;
        }

        // パスワードが設定されている場合は検証
        if (user.hasPassword()) {
            // TODO: bcrypt などでハッシュ化されたパスワードを検証
            if (user.password !== password) {
                return null;
            }
        }

        const token = UserSession.generateToken();
        const expiresAt = UserSession.createExpirationDate(30); // 30日間有効
        const session = UserSession.create(user.id!, token, expiresAt);

        const createdSession = await this.authRepository.createSession(session);

        return { user, session: createdSession };
    }
}
