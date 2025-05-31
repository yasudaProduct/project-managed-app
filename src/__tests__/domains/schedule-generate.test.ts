import { ScheduleGenerate } from "@/domains/wbs/schedule-generate";
import { Project } from "@/domains/project/project";

describe("ScheduleGenerate.execute", () => {
    let scheduleGenerate: ScheduleGenerate;

    beforeEach(() => {
        scheduleGenerate = new ScheduleGenerate();
    });

    it("工数が稼働可能時間内で1日で割り当てられる場合", async () => {
        const project = Project.create({
            name: "プロジェクトA",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-01"),
        });
        const operationPossible = { "2024-07-01": 8 };
        const taskData: { name: string, kosu: number }[] = [
            { name: "タスク1", kosu: 5 },
        ];
        const result = await scheduleGenerate.execute(project, operationPossible, taskData);
        expect(result).toEqual([
            { date: "2024-07-01", taskName: "タスク1", hours: 5 }
        ]);
    });

    it("工数が複数日にまたがる場合、稼働可能時間に合わせて分割される", async () => {
        const project = Project.create({
            name: "プロジェクトB",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-05"),
        });
        const operationPossible = {
            "2024-07-01": 4,
            "2024-07-02": 4,
            "2024-07-03": 4,
            "2024-07-04": 4,
            "2024-07-05": 4,
        };
        const taskData: { name: string, kosu: number }[] = [
            { name: "タスク1", kosu: 10 },
        ];
        const result = await scheduleGenerate.execute(project, operationPossible, taskData);
        expect(result).toEqual([
            { date: '2024-07-01', taskName: 'タスク1', hours: 4 },
            { date: '2024-07-02', taskName: 'タスク1', hours: 4 },
            { date: '2024-07-03', taskName: 'タスク1', hours: 2 },
        ]);
    });

    it("複数タスクがある場合、稼働可能時間を順番に消費していく", async () => {
        const project = Project.create({
            name: "プロジェクトC",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-10"),
        });
        const operationPossible = {
            "2024-07-01": 7.5,
            "2024-07-02": 7.5,
            "2024-07-03": 0,
            "2024-07-04": 7.5,
            "2024-07-05": 7.5,
        };
        const taskData: { name: string, kosu: number }[] = [
            { name: "タスク1", kosu: 5 },
            { name: "タスク2", kosu: 10 },
            { name: "タスク3", kosu: 10 },
            { name: "タスク4", kosu: 10 },
        ];
        const result = await scheduleGenerate.execute(project, operationPossible, taskData);
        expect(result).toEqual([
            { date: "2024-07-01", taskName: "タスク1", hours: 5 },
            { date: "2024-07-01", taskName: "タスク2", hours: 2.5 },
            { date: "2024-07-02", taskName: "タスク2", hours: 7.5 },
            { date: "2024-07-04", taskName: "タスク3", hours: 7.5 },
            { date: "2024-07-05", taskName: "タスク3", hours: 2.5 },
            { date: "2024-07-05", taskName: "タスク4", hours: 5 },
            { date: "2024-07-06", taskName: "タスク4", hours: 5 },
        ]);
    });

    it("稼働可能時間入れるが存在しない場合デフォルトで処理される", async () => {
        const project = Project.create({
            name: "プロジェクトE",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-05"),
        });
        const operationPossible = {
            "2024-07-01": 1,
        };
        const taskData: { name: string, kosu: number }[] = [
            { name: "タスク1", kosu: 10 },
        ];
        const result = await scheduleGenerate.execute(project, operationPossible, taskData);
        expect(result).toEqual([
            { date: "2024-07-01", taskName: "タスク1", hours: 1 },
            { date: "2024-07-02", taskName: "タスク1", hours: 7.5 },
            { date: "2024-07-03", taskName: "タスク1", hours: 1.5 },
        ]);
    });

    it("プロジェクト期間内で全てタスクを割り当てられない場合、例外が発生する", async () => {
        const project = Project.create({
            name: "プロジェクトD",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-02"),
        });
        const operationPossible = {
            "2024-07-01": 7.5,
            "2024-07-02": 7.5,
            "2024-07-03": 7.5,
        };
        const taskData: { name: string, kosu: number }[] = [
            { name: "タスク1", kosu: 10 },
            { name: "タスク2", kosu: 10 },
            { name: "タスク3", kosu: 10 },
        ];
        expect(scheduleGenerate.execute(project, operationPossible, taskData)).rejects.toThrow();
    });
}); 