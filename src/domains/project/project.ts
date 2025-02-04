import { ProjectStatus } from "./project-status";

export class Project {
    public readonly id?: string;
    public readonly name: string;
    private readonly status: ProjectStatus;
    public readonly description?: string;
    public readonly startDate: Date;
    public readonly endDate: Date;

    private constructor(args: { id?: string; name: string; status?: ProjectStatus; description?: string; startDate: Date; endDate: Date }) {
        this.id = args.id;
        this.name = args.name;
        this.status = args.status ?? new ProjectStatus({ status: 'INACTIVE' });
        this.description = args.description;
        this.startDate = args.startDate;
        this.endDate = args.endDate;
    }

    public isEqual(project: Project) {
        return this.id === project.id;
    }

    public static create(args: { name: string; description?: string; startDate: Date; endDate: Date }): Project {
        return new Project(args);
    }

    public static createFromDb(args: { id: string; name: string; status: ProjectStatus, description?: string; startDate: Date; endDate: Date }): Project {
        return new Project(args);
    }

    public getStatus() {
        return this.status.status;
    }

    public getStatusName() {
        return this.status.Name();
    }

}