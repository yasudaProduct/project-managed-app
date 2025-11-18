import { ProjectStatus as ProjectStatusType } from "@/types/wbs";

/**
 * プロジェクトステータス
 */
export class ProjectStatus {
    public readonly status: ProjectStatusType;

    constructor(args: { status: ProjectStatusType }) {
        this.status = args.status;
    }

    public isEqual(status: ProjectStatusType) {
        return this.status === status;
    }
}