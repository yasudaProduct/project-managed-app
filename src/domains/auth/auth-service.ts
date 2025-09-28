
import { User } from "../user/user";
import { UserSession } from "./user-session";

export interface IAuthRepository {
    findUserByEmail(email: string): Promise<User | null>;
    findUserById(id: string): Promise<User | null>;
    createUser(user: User): Promise<User>;
    updateUser(user: User): Promise<User>;
    createSession(session: UserSession): Promise<UserSession>;
    findSessionByToken(token: string): Promise<UserSession | null>;
    deleteSession(sessionId: string): Promise<void>;
    deleteExpiredSessions(): Promise<void>;
}

export class AuthService {
    constructor(private authRepository: IAuthRepository) { }

    async login(email: string, password?: string): Promise<{ user: User; session: UserSession } | null> {
        // メールアドレスでユーザーを検索
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

        // セッションを作成
        const token = UserSession.generateToken();
        const expiresAt = UserSession.createExpirationDate(30); // 30日間有効
        const session = UserSession.create(user.id!, token, expiresAt);

        const createdSession = await this.authRepository.createSession(session);

        return { user, session: createdSession };
    }

    async logout(sessionToken: string): Promise<boolean> {
        const session = await this.authRepository.findSessionByToken(sessionToken);
        if (!session) {
            return false;
        }

        await this.authRepository.deleteSession(session.id);
        return true;
    }

    async validateSession(sessionToken: string): Promise<User | null> {
        const session = await this.authRepository.findSessionByToken(sessionToken);
        if (!session || !session.isValid()) {
            return null;
        }

        const user = await this.authRepository.findUserById(session.userId);
        return user;
    }

    async cleanupExpiredSessions(): Promise<void> {
        await this.authRepository.deleteExpiredSessions();
    }
}