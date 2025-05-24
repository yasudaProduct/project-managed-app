import { GetOperationPossible } from "@/domains/wbs/get-operation-possible";
import { Project } from "@/domains/project/project";
import { Wbs } from "@/domains/wbs/wbs";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";

jest.mock("@/lib/utils", () => ({
    isHoliday: jest.fn(),
}));

const isHoliday = (jest.requireMock("@/lib/utils").isHoliday as jest.Mock);

describe("GetOperationPossible.execute", () => {
    let getOperationPossible: GetOperationPossible;

    beforeEach(() => {
        getOperationPossible = new GetOperationPossible();
        jest.clearAllMocks();
    });

    it("平日だけ稼働可能時間が7.5、祝日は0になる", async () => {
        const project = Project.create({
            name: "プロジェクトA",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-03"),
        });
        const wbs = Wbs.create({ name: "WBS1", projectId: "p1" });
        const assignee = WbsAssignee.create({ userId: "u1", rate: 1 });

        // 7/2だけ祝日
        isHoliday.mockImplementation((date: Date) => date.toISOString().slice(0, 10) === "2024-07-02");

        const result = await getOperationPossible.execute(project, wbs, assignee);
        expect(result).toEqual({
            "2024-07-01": 7.5,
            "2024-07-02": 0,
            "2024-07-03": 7.5,
        });
    });

    it("assignee.getRate()が0.5の場合、稼働可能時間も半分になる", async () => {
        const project = Project.create({
            name: "プロジェクトB",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-01"),
        });
        const wbs = Wbs.create({ name: "WBS2", projectId: "p2" });
        const assignee = WbsAssignee.create({ userId: "u2", rate: 0.5 });
        isHoliday.mockReturnValue(false);
        const result = await getOperationPossible.execute(project, wbs, assignee);
        expect(result).toEqual({ "2024-07-01": 3.75 });
    });

    it("稼働可能時間が0.5の場合、稼働可能時間も半分になる", async () => {
        const project = Project.create({
            name: "プロジェクトA",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-07-05"),
        });
        const wbs = Wbs.create({ name: "WBS1", projectId: "p1" });
        const assignee = WbsAssignee.create({ userId: "u1", rate: 0.5 });

        // 7/2だけ祝日
        isHoliday.mockImplementation((date: Date) => date.toISOString().slice(0, 10) === "2024-07-02");

        const result = await getOperationPossible.execute(project, wbs, assignee);
        expect(result).toEqual({
            "2024-07-01": 3.75,
            "2024-07-02": 0,
            "2024-07-03": 3.75,
            "2024-07-04": 3.75,
            "2024-07-05": 3.75,
        });
    });
});
