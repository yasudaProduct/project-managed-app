import { IUserRepository } from "@/applications/user/iuser-repositroy";
import { User } from "@/domains/user/user";
import { injectable } from "inversify";
import prisma from "@/lib/prisma/prisma";
import type { Users as UserDb } from "@prisma/client";

@injectable()
export class UserRepository implements IUserRepository {

    async findAll(): Promise<User[]> {
        const usersDb = await prisma.users.findMany();

        return usersDb.map(this.createUser);
    }

    async findByWbsDisplayName(wbsDisplayName: string): Promise<User[]> {
        const usersDb = await prisma.users.findMany({
            where: {
                displayName: wbsDisplayName,
            },
        });

        return usersDb.map(this.createUser);
    }

    async save(user: User): Promise<User> {
        const userDb = await prisma.users.create({
            data: {
                id: user.id!,
                name: user.name,
                displayName: user.displayName,
                email: user.email,
            },
        });

        return this.createUser(userDb);
    }

    private createUser(userDb: UserDb): User {
        return User.createFromDb({
            id: userDb.id,
            name: userDb.name,
            displayName: userDb.displayName,
            email: userDb.email,
        });
    }
}