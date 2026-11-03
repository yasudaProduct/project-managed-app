import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.mock("@/app/schedule/actions", () => ({
  importOutlookSchedule: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

import { OutlookImportForm } from "@/app/schedule/import/_components/outlook-import-form";
import { importOutlookSchedule } from "@/app/schedule/actions";
import { toast } from "@/hooks/use-toast";
import type { OutlookScheduleImportSummaryDto } from "@/types/outlook-calendar";

const mockImport = importOutlookSchedule as jest.Mock;

// jsdom に無い API（Radix の Select が要求）をスタブ
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

const users = [
  { id: "u1", name: "山田太郎", email: "yamada@example.com" },
  { id: "u2", name: "佐藤花子", email: "sato@example.com" },
];

const CSV = [
  '"件名","開始日","開始時刻","終了日","終了時刻","終日イベント","必須出席者","場所","公開する時間帯の種類"',
  '"定例会議","2026/11/2","10:00:00","2026/11/2","11:00:00","FALSE","佐藤","会議室A","2"',
].join("\r\n");

const csvFile = (content = CSV, name = "calendar.csv") => new File([content], name, { type: "text/csv" });

const summary: OutlookScheduleImportSummaryDto = {
  importedEventCount: 2,
  createdScheduleCount: 3,
  skippedEventCount: 1,
  periodStart: "2026-11-02",
  periodEnd: "2026-11-11",
  errors: [{ rowNumber: 5, message: "開始日が不正です（不明）" }],
};

async function selectUser(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("combobox", { name: "取り込み先ユーザー" }));
  await user.click(screen.getByRole("option", { name }));
}

describe("OutlookImportForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImport.mockResolvedValue({ success: true, data: summary });
  });

  it("ユーザーとファイルが未選択のままインポートすると入力エラーを表示し、取り込まないこと", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.click(screen.getByRole("button", { name: "インポート" }));

    expect(await screen.findByText("取り込み先のユーザーを選択してください")).toBeInTheDocument();
    expect(screen.getByText("ファイルを選択してください")).toBeInTheDocument();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it("ユーザーとCSVを選んでインポートすると、列名を正規化した行を選択ユーザーで取り込み、結果を表示すること", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await selectUser(user, "山田太郎");
    await user.upload(screen.getByLabelText("Outlookの予定表CSVファイル"), csvFile());
    expect(screen.getByText("calendar.csv")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => {
      expect(mockImport).toHaveBeenCalledWith({
        userId: "u1",
        rows: [
          {
            rowNumber: 2,
            subject: "定例会議",
            startDate: "2026/11/2",
            startTime: "10:00:00",
            endDate: "2026/11/2",
            endTime: "11:00:00",
            allDay: "FALSE",
            location: "会議室A",
            showTimeAs: "2",
          },
        ],
      });
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "スケジュールをインポートしました" }));
    expect(screen.getByTestId("outlook-import-imported-count")).toHaveTextContent("2件");
    expect(screen.getByTestId("outlook-import-created-count")).toHaveTextContent("3件");
    expect(screen.getByTestId("outlook-import-skipped-count")).toHaveTextContent("1件");
    expect(screen.getByTestId("outlook-import-period")).toHaveTextContent("2026/11/02 〜 2026/11/11");
    expect(screen.getByText("5行目: 開始日が不正です（不明）")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "スケジュールを確認" })).toHaveAttribute("href", "/schedule");
  });

  it("Outlookの形式ではないファイルはエラーを通知し、取り込まないこと", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await selectUser(user, "佐藤花子");
    await user.upload(
      screen.getByLabelText("Outlookの予定表CSVファイル"),
      csvFile("個人ｺｰﾄﾞ,氏名\nu1,山田", "other.csv")
    );
    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "Outlookの予定表エクスポート（CSV）の形式ではありません。必要な列（件名、開始日）が見つかりません。",
        })
      );
    });
    expect(mockImport).not.toHaveBeenCalled();
  });

  it("取り込みに失敗した場合はエラーを通知し、結果を表示しないこと", async () => {
    mockImport.mockResolvedValue({ success: false, error: "取り込み先のユーザーが存在しません" });
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await selectUser(user, "山田太郎");
    await user.upload(screen.getByLabelText("Outlookの予定表CSVファイル"), csvFile());
    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive", description: "取り込み先のユーザーが存在しません" })
      );
    });
    expect(screen.queryByTestId("outlook-import-imported-count")).not.toBeInTheDocument();
  });
});
