import { injectable } from "inversify";
import prisma from "@/lib/prisma/prisma";
import { IAuthRepository } from "@/domains/auth/auth-service";
import { User } from "@/domains/auth/user";
import { UserSession } from "@/domains/auth/user-session";

@injectable()
export class AuthRepository implements IAuthRepository {
    async findUserByEmail(email: string): Promise<User | null> {
        console.log("findUserByEmail", email);
        const userData = await prisma.users.findUnique({
            where: { email }
        });

        if (!userData) {
            return null;
        }

        return new User(
            userData.id,
            userData.email,
            userData.name,
            userData.displayName,
            userData.password || undefined,
            userData.createdAt,
            userData.updatedAt
        );
    }

    async findUserById(id: string): Promise<User | null> {
        const userData = await prisma.users.findUnique({
            where: { id }
        });

        if (!userData) {
            return null;
        }

        return new User(
            userData.id,
            userData.email,
            userData.name,
            userData.displayName,
            userData.password || undefined,
            userData.createdAt,
            userData.updatedAt
        );
    }

    async createUser(user: User): Promise<User> {
        const userData = await prisma.users.create({
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
                password: user.password
            }
        });

        return new User(
            userData.id,
            userData.email,
            userData.name,
            userData.displayName,
            userData.password || undefined,
            userData.createdAt,
            userData.updatedAt
        );
    }

    async updateUser(user: User): Promise<User> {
        const userData = await prisma.users.update({
            where: { id: user.id },
            data: {
                email: user.email,
                name: user.name,
                displayName: user.displayName,
                password: user.password
            }
        });

        return new User(
            userData.id,
            userData.email,
            userData.name,
            userData.displayName,
            userData.password || undefined,
            userData.createdAt,
            userData.updatedAt
        );
    }

    async createSession(session: UserSession): Promise<UserSession> {
        const sessionData = await prisma.userSession.create({
            data: {
                id: session.id,
                userId: session.userId,
                token: session.token,
                expiresAt: session.expiresAt
            }
        });

        return new UserSession(
            sessionData.id,
            sessionData.userId,
            sessionData.token,
            sessionData.expiresAt,
            sessionData.createdAt,
            sessionData.updatedAt
        );
    }

    async findSessionByToken(token: string): Promise<UserSession | null> {
        const sessionData = await prisma.userSession.findUnique({
            where: { token }
        });

        if (!sessionData) {
            return null;
        }

        return new UserSession(
            sessionData.id,
            sessionData.userId,
            sessionData.token,
            sessionData.expiresAt,
            sessionData.createdAt,
            sessionData.updatedAt
        );
    }

    async deleteSession(sessionId: string): Promise<void> {
        await prisma.userSession.delete({
            where: { id: sessionId }
        });
    }

    async deleteExpiredSessions(): Promise<void> {
        await prisma.userSession.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    }
}