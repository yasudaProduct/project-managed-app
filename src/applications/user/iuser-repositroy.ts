import { User } from "@/domains/user/user";

export interface IUserRepository {
    findAll(): Promise<User[]>;
    findByWbsDisplayName(wbsDisplayName: string): Promise<User[]>;
    findById(id: string): Promise<User | null>;
    create(user: { id: string; name: string; email: string; displayName: string; costPerHour: number }): Promise<User>;
    update(id: string, user: { name: string; email: string; displayName: string; costPerHour: number }): Promise<User>;
}