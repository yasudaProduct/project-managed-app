import { ProjectStatus } from "./project-status";
import type { ProjectKind, StandingCategory } from "@/types/project";

const CATEGORY_ONLY_FOR_STANDING = "分類は常設プロジェクトのみ設定できます";

export class Project {
    public readonly id?: string;
    public name: string;
    private status: ProjectStatus;
    public description?: string;
    public startDate: Date;
    public endDate: Date;
    /** 種別。案件（PROJECT）/ 常設（STANDING）。作成後は変更しない */
    public readonly kind: ProjectKind;
    /** 常設プロジェクトの分類（常設のみ） */
    public category?: StandingCategory;

    private constructor(args: {
        id?: string;
        name: string;
        status?: ProjectStatus;
        description?: string;
        startDate: Date;
        endDate: Date;
        kind?: ProjectKind;
        category?: StandingCategory;
    }) {
        this.id = args.id;
        this.name = args.name;
        this.status = args.status ?? new ProjectStatus({ status: 'INACTIVE' });
        this.description = args.description;
        this.startDate = args.startDate;
        this.endDate = args.endDate;
        this.kind = args.kind ?? 'PROJECT';
        this.category = args.category;

        this.validateCategory();
    }

    public isEqual(project: Project) {
        if (this.id === undefined || project.id === undefined) {
            return false;
        }
        return this.id === project.id;
    }

    public static create(args: {
        name: string;
        description?: string;
        startDate: Date;
        endDate: Date;
        kind?: ProjectKind;
        category?: StandingCategory;
    }): Project {
        return new Project(args);
    }

    public static createFromDb(args: {
        id: string;
        name: string;
        status: ProjectStatus;
        description?: string;
        startDate: Date;
        endDate: Date;
        kind?: ProjectKind;
        category?: StandingCategory;
    }): Project {
        return new Project(args);
    }

    public getStatus() {
        return this.status.status;
    }

    /** 常設プロジェクト（定常・不定期作業の受け皿）か */
    public isStanding(): boolean {
        return this.kind === 'STANDING';
    }

    public updateName(name: string) {
        this.name = name;
    }

    public updateDescription(description: string) {
        this.description = description;
    }

    public updateStartDate(startDate: Date) {
        if (startDate > this.endDate) {
            throw new Error("開始日は終了日より前に設定してください");
        }
        this.startDate = startDate;
    }

    public updateEndDate(endDate: Date) {
        if (endDate < this.startDate) {
            throw new Error("終了日は開始日より後に設定してください");
        }
        this.endDate = endDate;
    }

    public updateStatus(status: ProjectStatus) {
        this.status = status;
    }

    public updateCategory(category: StandingCategory) {
        if (!this.isStanding()) {
            throw new Error(CATEGORY_ONLY_FOR_STANDING);
        }
        this.category = category;
    }

    private validateCategory() {
        if (this.category !== undefined && !this.isStanding()) {
            throw new Error(CATEGORY_ONLY_FOR_STANDING);
        }
    }

}
