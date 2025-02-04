import { ProjectStatus } from "./wbs";

export type Project = {
    id: string;
    name: string;
    status: ProjectStatus;
    description?: string;
    startDate: Date;
    endDate: Date;
}