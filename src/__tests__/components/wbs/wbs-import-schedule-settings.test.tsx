import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { WbsImportScheduleSettings } from "@/components/wbs/wbs-import-schedule-settings";
import type { WbsImportScheduleDto } from "@/types/import-schedule";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/app/wbs/[id]/import-schedule-actions", () => ({
  updateWbsImportSchedule: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

import { updateWbsImportSchedule } from "@/app/wbs/[id]/import-schedule-actions";
import { toast } from "@/hooks/use-toast";

const mockUpdate = updateWbsImportSchedule as jest.Mock;

// jsdom に無い API（Radix が要求）をスタブ
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
  Element.prototype.releasePointerCapture = jest.fn();
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

function makeSchedule(overrides: Partial<WbsImportScheduleDto> = {}): WbsImportScheduleDto {
  return {
    wbsId: 1,
    isEnabled: false,
    cronExpression: "0 3 * * *",
    timezone: "Asia/Tokyo",
    syncMode: "diff",
    includeActuals: false,
    nextRunAt: null,
    lastRunAt: null,
    ...overrides,
  };
}

describe("WbsImportScheduleSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({ success: true, data: undefined });
  });

  it("頻度の選択肢として「毎日（3:00）」「毎日 9時・12時・17時」「毎時」を表示し、現在の設定を選択状態にする", () => {
    render(<WbsImportScheduleSettings wbsId={1} schedule={makeSchedule({ cronExpression: "0 9,12,17 * * *" })} />);

    expect(screen.getByLabelText("毎日（3:00）")).not.toBeChecked();
    expect(screen.getByLabelText("毎日 9時・12時・17時")).toBeChecked();
    expect(screen.getByLabelText("毎時")).not.toBeChecked();
  });

  it("選択肢にない実行タイミングが保存されている場合は、カスタムとして表示し選択状態にする", () => {
    render(<WbsImportScheduleSettings wbsId={1} schedule={makeSchedule({ cronExpression: "30 8 * * 1-5" })} />);

    expect(screen.getByLabelText("カスタム（30 8 * * 1-5）")).toBeChecked();
  });

  it("有効化・頻度・同期モード・実績取込を選んで保存すると、選んだ内容で保存し画面を更新する", async () => {
    render(<WbsImportScheduleSettings wbsId={1} schedule={makeSchedule()} />);

    fireEvent.click(screen.getByRole("switch", { name: "定期インポートを行う" }));
    fireEvent.click(screen.getByLabelText("毎時"));
    fireEvent.click(screen.getByLabelText(/^洗い替え/));
    fireEvent.click(screen.getByRole("switch", { name: "実績（Geppo）も取り込む" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        wbsId: 1,
        isEnabled: true,
        cronExpression: "0 * * * *",
        syncMode: "replace",
        includeActuals: true,
      });
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "保存しました" }));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("保存に失敗した場合はエラーを表示する", async () => {
    mockUpdate.mockResolvedValue({ success: false, error: "実行タイミングの指定が不正です" });
    render(<WbsImportScheduleSettings wbsId={1} schedule={makeSchedule()} />);

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive", description: "実行タイミングの指定が不正です" })
      );
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("洗い替えで実績を取り込まない設定では、実績の紐付けが外れる旨の注意を表示する", () => {
    render(<WbsImportScheduleSettings wbsId={1} schedule={makeSchedule({ syncMode: "replace" })} />);

    expect(screen.getByText(/実績とタスクの紐付けが外れます/)).toBeInTheDocument();
  });

  it("次回実行予定と前回実行日時を表示する", () => {
    render(
      <WbsImportScheduleSettings
        wbsId={1}
        schedule={makeSchedule({
          isEnabled: true,
          nextRunAt: "2026-10-24T03:00:00.000Z",
          lastRunAt: "2026-10-24T00:00:05.000Z",
        })}
      />
    );

    expect(screen.getByTestId("import-schedule-next-run")).not.toHaveTextContent("—");
    expect(screen.getByTestId("import-schedule-last-run")).not.toHaveTextContent("—");
  });

  it("無効の場合、次回実行予定は表示しない", () => {
    render(<WbsImportScheduleSettings wbsId={1} schedule={makeSchedule()} />);

    expect(screen.getByTestId("import-schedule-next-run")).toHaveTextContent("—");
  });
});
