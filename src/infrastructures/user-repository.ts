import { IUserRepository } from "@/applications/user/iuser-repositroy";
import { User } from "@/domains/user/user";
import { injectable } from "inversify";

@injectable()
export class UserRepository implements IUserRepository {

    async findAll(): Promise<User[]> {
        const usersDb = await prisma.users.findMany();

        return usersDb.map(userDb => User.createFromDb({
            id: userDb.id,
            name: userDb.name,
            displayName: userDb.displayName,
            email: userDb.email,
        }));
    }
}