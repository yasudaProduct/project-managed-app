/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma/prisma", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("@/lib/inversify.config", () => ({
  container: {
    get: jest.fn(),
  },
}));

import { createProject, updateProject } from "@/app/projects/actions";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";

/** プロジェクト作成・更新の Server Action に種別（案件 / 常設）と分類を渡す */
describe("projects actions（種別・分類）", () => {
  const mockService = {
    getProjectById: jest.fn(),
    getProjectAll: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
  };
  const startDate = new Date("2026-04-01T00:00:00.000Z");
  const endDate = new Date("2027-03-31T00:00:00.000Z");
  const createdProject = {
    id: "p-standing",
    name: "社内業務",
    status: "INACTIVE",
    description: "",
    startDate,
    endDate,
    kind: "STANDING",
    category: "INTERNAL",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (container.get as jest.Mock).mockImplementation((symbol: symbol) => {
      if (symbol === SYMBOL.IProjectApplicationService) return mockService;
      throw new Error(`unexpected symbol: ${String(symbol)}`);
    });
    mockService.getProjectById.mockResolvedValue(createdProject);
  });

  it("常設プロジェクトを分類付きで作成できる", async () => {
    mockService.createProject.mockResolvedValue({ success: true, id: "p-standing" });

    const result = await createProject({
      name: "社内業務",
      description: "",
      startDate,
      endDate,
      kind: "STANDING",
      category: "INTERNAL",
    });

    expect(result).toEqual({ success: true, data: createdProject });
    expect(mockService.createProject).toHaveBeenCalledWith({
      name: "社内業務",
      description: "",
      startDate,
      endDate,
      kind: "STANDING",
      category: "INTERNAL",
    });
  });

  it("種別を省略すると案件として作成する（既存の呼び出しと互換）", async () => {
    mockService.createProject.mockResolvedValue({ success: true, id: "p-standing" });

    await createProject({ name: "案件A", description: "", startDate, endDate });

    expect(mockService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: "案件A", kind: undefined, category: undefined })
    );
  });

  it("不正な種別・分類は入力エラーにする", async () => {
    await expect(
      createProject({ name: "x", description: "", startDate, endDate, kind: "FOO" as never })
    ).resolves.toEqual({ success: false, error: "入力値が不正です。" });
    await expect(
      createProject({ name: "x", description: "", startDate, endDate, kind: "STANDING", category: "BAR" as never })
    ).resolves.toEqual({ success: false, error: "入力値が不正です。" });
    expect(mockService.createProject).not.toHaveBeenCalled();
  });

  it("サービスの失敗（案件に分類など）はエラーとして返す", async () => {
    mockService.createProject.mockResolvedValue({ success: false, error: "分類は常設プロジェクトのみ設定できます" });

    const result = await createProject({
      name: "案件A",
      description: "",
      startDate,
      endDate,
      kind: "PROJECT",
      category: "INTERNAL",
    });

    expect(result).toEqual({ success: false, error: "分類は常設プロジェクトのみ設定できます" });
  });

  it("更新では分類をサービスへ渡す", async () => {
    mockService.updateProject.mockResolvedValue({ success: true, id: "p-standing" });

    const result = await updateProject("p-standing", {
      name: "社内業務",
      description: "",
      startDate: "2026/04/01",
      endDate: "2027/03/31",
      status: "ACTIVE",
      category: "MAINTENANCE",
    });

    expect(result.success).toBe(true);
    expect(mockService.updateProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p-standing", status: "ACTIVE", category: "MAINTENANCE" })
    );
  });
});
