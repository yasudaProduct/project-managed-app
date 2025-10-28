import { User } from "@/types/user";
import { inject, injectable } from "inversify";
import type { IUserRepository } from "./iuser-repositroy";
import { SYMBOL } from "@/types/symbol";

export interface IUserApplicationService {
    getAllUsers(): Promise<User[]>;
    getUserById(id: string): Promise<User | null>;
    createUser(userData: { id: string, name: string; email: string, displayName: string }): Promise<{ success: boolean; user?: User; error?: string }>;
    updateUser(id: string, userData: { name: string; email: string, displayName: string }): Promise<{ success: boolean; user?: User; error?: string }>;
}

@injectable()
export class UserApplicationService implements IUserApplicationService {
    constructor(
        @inject(SYMBOL.IUserRepository) private userRepository: IUserRepository
    ) {
    }

    public async getAllUsers(): Promise<User[]> {
        const domainUsers = await this.userRepository.findAll();
        return domainUsers.map(user => ({
            id: user.id as string,
            name: user.name,
            email: user.email,
            displayName: user.displayName,
        }));
    }

    public async getUserById(id: string): Promise<User | null> {
        const domainUser = await this.userRepository.findById(id);
        if (!domainUser) return null;

        return {
            id: domainUser.id as string,
            name: domainUser.name,
            email: domainUser.email,
            displayName: domainUser.displayName,
        };
    }

    public async createUser(userData: { id: string, name: string; email: string, displayName: string }): Promise<{ success: boolean; user?: User; error?: string }> {
        try {
            const domainUser = await this.userRepository.create({
                id: userData.id,
                name: userData.name,
                email: userData.email,
                displayName: userData.displayName,
            });

            const user: User = {
                id: domainUser.id as string,
                name: domainUser.name,
                email: domainUser.email,
                displayName: domainUser.displayName,
            };

            return { success: true, user };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "ユーザーの作成に失敗しました" };
        }
    }

    public async updateUser(id: string, userData: { name: string; email: string, displayName: string }): Promise<{ success: boolean; user?: User; error?: string }> {
        try {
            const existingUser = await this.userRepository.findById(id);
            if (!existingUser) {
                return { success: false, error: "ユーザーが見つかりません" };
            }

            const updatedDomainUser = await this.userRepository.update(id, {
                name: userData.name,
                email: userData.email,
                displayName: userData.displayName,
            });

            const user: User = {
                id: updatedDomainUser.id as string,
                name: updatedDomainUser.name,
                email: updatedDomainUser.email,
                displayName: updatedDomainUser.displayName,
            };

            return { success: true, user };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "ユーザーの更新に失敗しました" };
        }
    }
}