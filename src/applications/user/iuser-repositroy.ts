import { User } from "@/domains/user/user";

export interface IUserRepository {
    findAll(): Promise<User[]>;
    findByWbsDisplayName(wbsDisplayName: string): Promise<User[]>;
}