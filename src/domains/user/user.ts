export class User {
    public readonly id?: string;
    public name: string;
    public displayName: string;;

    private constructor(args: { id?: string; name: string; displayName: string }) {
        this.id = args.id;
        this.name = args.name;
        this.displayName = args.displayName;
    }

    public isEqual(user: User) {
        return this.id === user.id;
    }

    public static create(args: { name: string; displayName: string }): User {
        return new User(args);
    }

    public static createFromDb(args: { id: string; name: string; displayName: string }): User {
        return new User(args);
    }

}
