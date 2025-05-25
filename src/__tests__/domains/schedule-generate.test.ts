import { ScheduleGenerate } from "@/domains/wbs/schedule-generate";
import { Project } from "@/domains/project/project";
import type { taskCsvData } from "@/types/csv";

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
        const taskData: taskCsvData[] = [
            { name: "タスク1", userId: "u1", phaseId: "p1", kosu: 5 },
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
            endDate: new Date("2024-07-03"),
        });
        const operationPossible = {
            "2024-07-01": 4,
            "2024-07-02": 4,
            "2024-07-03": 4,
        };
        const taskData: taskCsvData[] = [
            { name: "タスク1", userId: "u1", phaseId: "p1", kosu: 10 },
            { name: "タスク2", userId: "u2", phaseId: "p2", kosu: 10 },
        ];
        const result = await scheduleGenerate.execute(project, operationPossible, taskData);
        expect(result).toEqual([
            { date: "2024-07-01", taskName: "タスク2", hours: 4 },
            { date: "2024-07-02", taskName: "タスク2", hours: 4 },
            { date: "2024-07-03", taskName: "タスク2", hours: 2 }
        ]);
    });

    it("複数タスクがある場合、稼働可能時間を順番に消費していく", async () => {
        const project = Project.create({
            name: "プロジェクトC",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-05"),
        });
        const operationPossible = {
            "2024-07-01": 7.5,
            "2024-07-02": 7.5,
            "2024-07-03": 7.5,
            "2024-07-04": 7.5,
            "2024-07-05": 7.5,
        };
        const taskData: taskCsvData[] = [
            { name: "タスク1", userId: "u1", phaseId: "p1", kosu: 5 },
            { name: "タスク2", userId: "u1", phaseId: "p1", kosu: 10 },
            { name: "タスク3", userId: "u1", phaseId: "p1", kosu: 10 },
            { name: "タスク4", userId: "u1", phaseId: "p1", kosu: 10 },
        ];
        const result = await scheduleGenerate.execute(project, operationPossible, taskData);
        console.log(result);
        expect(result).toEqual([
            { date: "2024-07-01", taskName: "タスク1", hours: 5 },
            { date: "2024-07-01", taskName: "タスク2", hours: 2.5 },
            { date: "2024-07-02", taskName: "タスク2", hours: 7.5 },
            { date: "2024-07-03", taskName: "タスク3", hours: 7.5 },
            { date: "2024-07-04", taskName: "タスク3", hours: 2.5 },
            { date: "2024-07-04", taskName: "タスク4", hours: 5 },
            { date: "2024-07-05", taskName: "タスク4", hours: 5 },
        ]);
    });
}); 