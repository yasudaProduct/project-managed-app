import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ImportScheduleOverview } from "@/app/settings/system/_components/import-schedule-overview";
import type { WbsImportScheduleListItemDto } from "@/types/import-schedule";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/app/settings/system/import-schedule-actions", () => ({
  updateImportScheduleEnabled: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

import { updateImportScheduleEnabled } from "@/app/settings/system/import-schedule-actions";
import { toast } from "@/hooks/use-toast";

const mockUpdateEnabled = updateImportScheduleEnabled as jest.Mock;

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
  Element.prototype.releasePointerCapture = jest.fn();
});

function makeRow(overrides: Partial<WbsImportScheduleListItemDto> = {}): WbsImportScheduleListItemDto {
  return {
    wbsId: 1,
    wbsName: "新規機能開発A",
    projectId: "pj-1",
    projectName: "プロジェクト1",
    isEnabled: true,
    cronExpression: "0 9,12,17 * * *",
    timezone: "Asia/Tokyo",
    syncMode: "replace",
    includeActuals: true,
    nextRunAt: "2026-10-24T03:00:00.000Z",
    lastRunAt: null,
    ...overrides,
  };
}

describe("ImportScheduleOverview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateEnabled.mockResolvedValue({ success: true, data: undefined });
  });

  it("すべてのWBSの定期インポート設定を一覧表示し、各WBSの設定画面へのリンクを置く", () => {
    render(
      <ImportScheduleOverview
        settings={{ isEnabled: true }}
        schedules={[
          makeRow(),
          makeRow({
            wbsId: 2,
            wbsName: "保守B",
            isEnabled: false,
            cronExpression: "0 3 * * *",
            syncMode: "diff",
            includeActuals: false,
            nextRunAt: null,
          }),
        ]}
      />
    );

    const enabledRow = screen.getByRole("row", { name: /新規機能開発A/ });
    expect(within(enabledRow).getByText("プロジェクト1")).toBeInTheDocument();
    expect(within(enabledRow).getByText("有効")).toBeInTheDocument();
    expect(within(enabledRow).getByText("毎日 9時・12時・17時")).toBeInTheDocument();
    expect(within(enabledRow).getByText("洗い替え")).toBeInTheDocument();
    expect(within(enabledRow).getByText("取り込む")).toBeInTheDocument();
    expect(within(enabledRow).getByRole("link", { name: "設定" })).toHaveAttribute("href", "/wbs/1?tab=settings");

    const disabledRow = screen.getByRole("row", { name: /保守B/ });
    expect(within(disabledRow).getByText("無効")).toBeInTheDocument();
    expect(within(disabledRow).getByText("—")).toBeInTheDocument();

    expect(screen.getByText("有効 1件 / 全2件")).toBeInTheDocument();
  });

  it("全体スイッチを切り替えると保存して画面を更新する", async () => {
    render(<ImportScheduleOverview settings={{ isEnabled: true }} schedules={[makeRow()]} />);

    fireEvent.click(screen.getByRole("switch", { name: "定期インポートを有効にする" }));

    await waitFor(() => expect(mockUpdateEnabled).toHaveBeenCalledWith(false));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "保存しました" }));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("全体で停止中の場合は、予定がスキップされる旨を表示する", () => {
    render(<ImportScheduleOverview settings={{ isEnabled: false }} schedules={[makeRow()]} />);

    expect(screen.getByRole("switch", { name: "定期インポートを有効にする" })).not.toBeChecked();
    expect(screen.getByText(/停止中/)).toBeInTheDocument();
  });

  it("WBSがない場合はその旨を表示する", () => {
    render(<ImportScheduleOverview settings={{ isEnabled: true }} schedules={[]} />);

    expect(screen.getByText("WBSがありません")).toBeInTheDocument();
  });
});
