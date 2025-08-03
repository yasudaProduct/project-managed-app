import { User } from "@/types/user";
import { injectable } from "inversify";

export interface IUserApplicationService {
    getAllUsers(): Promise<User[]>;
}

@injectable()
export class UserApplicationService implements IUserApplicationService {
    constructor() {
    }

    public async getAllUsers(): Promise<User[]> {
        return []
    }
}