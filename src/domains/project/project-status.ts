import { ProjectStatus as ProjectStatusType } from "@/types/wbs";

/**
 * プロジェクトステータス
 */
export class ProjectStatus {
    public readonly status: ProjectStatusType;

    constructor(args: { status: ProjectStatusType }) {
        this.status = args.status;
    }

    /**
     * ステータス名を取得
     * @returns ステータス名
     */
    public Name() {
        switch (this.status) {
            case "INACTIVE":
                return "未開始";
            case "ACTIVE":
                return "進行中";
            case "DONE":
                return "完了";
            case "CANCELLED":
                return "キャンセル";
            case "PENDING":
                return "保留";
            default:
                return "不明";
        }
    }

    public isEqual(status: ProjectStatusType) {
        return this.status === status;
    }
}