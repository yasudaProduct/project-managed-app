/**
 * @jest-environment node
 */

// Prismaモジュールをモック化（インポート前にモックする必要がある）
jest.mock("@/lib/prisma/prisma", () => ({
  __esModule: true,
  default: {},
}));

// DIコンテナのモック
jest.mock("@/lib/inversify.config", () => ({
  container: {
    get: jest.fn(),
  },
}));

import { executeImportJob } from "@/app/import-jobs/actions";
import { container } from "@/lib/inversify.config";
import { ImportJob } from "@/domains/import-job/import-job";

describe("import-jobs actions", () => {
  const mockImportJobService = {
    getJob: jest.fn(),
    startJob: jest.fn(),
    executeJobAsync: jest.fn(),
  };

  beforeEach(() => {
    (container.get as jest.Mock).mockReset();
    (container.get as jest.Mock).mockReturnValue(mockImportJobService);
    mockImportJobService.getJob.mockReset();
    mockImportJobService.startJob.mockReset();
    mockImportJobService.executeJobAsync.mockReset();
    mockImportJobService.getJob.mockResolvedValue(
      Object.assign(ImportJob.create({ type: "WBS", wbsId: 1, options: {} }), { id: "job-1" })
    );
  });

  describe("executeImportJob", () => {
    it("ジョブを開始できた場合はバックグラウンド実行を起動する", async () => {
      mockImportJobService.startJob.mockResolvedValue("STARTED");

      const result = await executeImportJob("job-1");

      expect(result).toEqual({ success: true, data: { isQueued: false } });
      expect(mockImportJobService.executeJobAsync).toHaveBeenCalledWith("job-1");
    });

    it("他のジョブが実行中の場合は実行待ちとして返し、完了後の順番実行に任せる", async () => {
      mockImportJobService.startJob.mockResolvedValue("BUSY");

      const result = await executeImportJob("job-1");

      expect(result).toEqual({ success: true, data: { isQueued: true } });
      expect(mockImportJobService.executeJobAsync).not.toHaveBeenCalled();
    });

    it("cron 等が先に開始していた場合はエラーを返し、二重に実行しない", async () => {
      mockImportJobService.startJob.mockResolvedValue("NOT_PENDING");

      const result = await executeImportJob("job-1");

      expect(result).toEqual({ success: false, error: "ジョブは保留中ではありません" });
      expect(mockImportJobService.executeJobAsync).not.toHaveBeenCalled();
    });

    it("ジョブが存在しない場合はエラーを返す", async () => {
      mockImportJobService.getJob.mockResolvedValue(null);

      const result = await executeImportJob("missing");

      expect(result).toEqual({ success: false, error: "ジョブが見つかりません" });
      expect(mockImportJobService.startJob).not.toHaveBeenCalled();
    });
  });
});
