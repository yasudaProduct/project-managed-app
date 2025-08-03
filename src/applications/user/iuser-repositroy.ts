import { User } from "@/domains/user/user";

export interface IUserRepository {
    findAll(): Promise<User[]>;
}