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

    async findById(id: string): Promise<User | null> {
        const userDb = await prisma.users.findUnique({
            where: { id },
        });
        return userDb ? this.createUser(userDb) : null;
    }

    async create(user: { id: string; name: string; email: string; displayName: string; costPerHour: number }): Promise<User> {
        const userDb = await prisma.users.create({
            data: {
                id: user.id,
                name: user.name,
                displayName: user.displayName,
                email: user.email,
                costPerHour: user.costPerHour,
            },
        });
        return this.createUser(userDb);
    }

    async update(id: string, user: { name: string; email: string; displayName: string; costPerHour: number }): Promise<User> {
        const userDb = await prisma.users.update({
            where: { id },
            data: {
                name: user.name,
                displayName: user.displayName,
                email: user.email,
                costPerHour: user.costPerHour,
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
            costPerHour: userDb.costPerHour,
        });
    }
}