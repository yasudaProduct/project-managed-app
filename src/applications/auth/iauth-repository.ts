import { User } from "@/domains/user/user";
import { UserSession } from "@/domains/auth/user-session";

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


