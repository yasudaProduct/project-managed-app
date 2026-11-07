import type { IProjectRepository } from "@/applications/projects/iproject-repository";
import { Project } from "@/domains/project/project";
import { ProjectStatus } from "@/domains/project/project-status";
import type { Project as ProjectType, ProjectKind, StandingCategory } from "@/types/project";
import { SYMBOL } from "@/types/symbol";
import { ProjectStatus as ProjectStatusType} from "@/types/wbs";
import { inject, injectable } from "inversify";
import type { IWbsRepository } from "../wbs/iwbs-repository";
import { Wbs } from "@/domains/wbs/wbs";

export type CreateProjectInput = {
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    /** 種別（省略時は案件）。作成後は変更しない */
    kind?: ProjectKind;
    /** 常設プロジェクトの分類（常設のみ） */
    category?: StandingCategory;
};

export type UpdateProjectInput = {
    id: string;
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    status?: ProjectStatusType;
    /** 常設プロジェクトの分類（常設のみ） */
    category?: StandingCategory;
};

export interface IProjectApplicationService {
    getProjectById(id: string): Promise<ProjectType | null>;
    getProjectAll(): Promise<ProjectType[] | null>;
    createProject(args: CreateProjectInput): Promise<{ success: boolean; error?: string; id?: string }>;
    updateProject(args: UpdateProjectInput): Promise<{ success: boolean; error?: string; id?: string }>;
    deleteProject(id: string): Promise<{ success: boolean; error?: string; id?: string }>;
}

/**
 * プロジェクトアプリケーションサービス
 */
@injectable()
export class ProjectApplicationService implements IProjectApplicationService {

    constructor(
        @inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository,
        @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository
    ) {
    }

    /**
     * プロジェクトを取得
     * @param id プロジェクトID
     * @returns プロジェクト
     */
    public async getProjectById(id: string): Promise<ProjectType | null> {
        const project = await this.projectRepository.findById(id);
        if (!project) return null;
        return toProjectDto(project);
    }

    /**
     * プロジェクト一覧を取得
     * @returns プロジェクト一覧
     */
    public async getProjectAll(): Promise<ProjectType[] | null> {
        const projects = await this.projectRepository.findAll();

        return projects.map((project) => toProjectDto(project));
    }

    /**
     * プロジェクトを作成
     * @param args プロジェクトデータ
     * @returns プロジェクト
     */
    public async createProject(args: CreateProjectInput): Promise<{ success: boolean; error?: string; id?: string }> {
        let project: Project;
        try {
            project = Project.create({
                name: args.name,
                description: args.description,
                startDate: args.startDate,
                endDate: args.endDate,
                kind: args.kind,
                category: args.category,
            });
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "プロジェクトの作成に失敗しました。" };
        }

        const check = await this.projectRepository.findByName(project.name);
        if (check) {
            return { success: false, error: "同様のプロジェクト名が存在します。" }
        }

        const newProject = await this.projectRepository.create(project);

        // プロジェクト作成時にWBSを自動作成
        const wbs = Wbs.create({
            name: project.name,  // WBS名はプロジェクト名と同一
            projectId: newProject.id!,
        });
        await this.wbsRepository.create(wbs);

        return { success: true, id: newProject.id }
    }

    /**
     * プロジェクトを更新
     * @param args プロジェクトデータ
     * @returns プロジェクト
     */
    public async updateProject(args: UpdateProjectInput): Promise<{ success: boolean; error?: string; id?: string }> {
        const project: Project | null = await this.projectRepository.findById(args.id);
        if (!project) return { success: false, error: "プロジェクトが存在しません。" }

        const oldName = project.name;

        try {
            if (args.name) project.updateName(args.name);
            if (args.description) project.updateDescription(args.description);
            if (args.startDate) project.updateStartDate(args.startDate);
            if (args.endDate) project.updateEndDate(args.endDate);
            if (args.status) project.updateStatus(new ProjectStatus({ status: args.status }));
            if (args.category) project.updateCategory(args.category);
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "プロジェクトの更新に失敗しました。" };
        }

        // プロジェクト名の重複チェック
        const check = await this.projectRepository.findByName(project.name);
        if (check && !check.isEqual(project)) {
            return { success: false, error: "同様のプロジェクト名が存在します。" }
        }

        const udpatedProject = await this.projectRepository.update(project);

        // プロジェクト名が変更された場合、最新のWBS名も更新
        if (args.name && oldName !== args.name) {
            const wbsList = await this.wbsRepository.findByProjectId(args.id);
            if (wbsList && wbsList.length > 0) {
                // 最新のWBSを取得（IDが大きいものが新しい）
                const latestWbs = wbsList.reduce((latest, current) => {
                    return current.id! > latest.id! ? current : latest;
                });

                // WBS名をプロジェクト名と同一に更新
                latestWbs.updateName(args.name);
                await this.wbsRepository.update(latestWbs);
            }
        }

        return { success: true, id: udpatedProject.id }
    }

    /**
     * プロジェクトを削除
     * @param id プロジェクトID
     * @returns プロジェクト
     */
    public async deleteProject(id: string): Promise<{ success: boolean; error?: string; id?: string }> {
        const project = await this.projectRepository.findById(id);
        if (!project) return { success: false, error: "プロジェクトが存在しません。" }
        await this.projectRepository.delete(id);
        return { success: true, id: id }
    }

}

function toProjectDto(project: Project): ProjectType {
    return {
        id: project.id!,
        name: project.name,
        status: project.getStatus(),
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        kind: project.kind,
        category: project.category,
    };
}
