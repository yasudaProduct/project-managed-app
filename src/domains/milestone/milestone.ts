import type { MilestoneTarget } from "@/types/milestone";

export class Milestone {
    public readonly id: number;
    public readonly name: string;
    public readonly date: Date;
    /** 達成の対象（既定はイベント＝対象なし） */
    public readonly target: MilestoneTarget;
    /** 達成日（記録した場合） */
    public readonly achievedAt: Date | null;

    private constructor(args: {
        id: number;
        name: string;
        date: Date;
        target?: MilestoneTarget;
        achievedAt?: Date | null;
    }) {
        this.id = args.id;
        this.name = args.name;
        this.date = args.date;
        this.target = args.target ?? { targetType: 'EVENT' };
        this.achievedAt = args.achievedAt ?? null;
    }

    public static create(args: {
        id: number;
        name: string;
        date: Date;
        target?: MilestoneTarget;
        achievedAt?: Date | null;
    }): Milestone {
        return new Milestone(args);
    }

    public static createFromDb(args: {
        id: number;
        name: string;
        date: Date;
        target?: MilestoneTarget;
        achievedAt?: Date | null;
    }): Milestone {
        return new Milestone(args);
    }
}
