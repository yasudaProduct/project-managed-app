import { render, screen, waitFor, within } from "@testing-library/react";
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
  { id: "12345", name: "山田太郎", displayName: "山田", email: "yamada@example.com" },
  { id: "23456", name: "佐藤花子", displayName: "佐藤", email: "sato@example.com" },
  { id: "34567", name: "鈴木一郎", displayName: "鈴木", email: "suzuki@example.com" },
];

const HEADER =
  '"件名","開始日","開始時刻","終了日","終了時刻","終日イベント","必須出席者","場所","公開する時間帯の種類"';
const csvOf = (subject: string) =>
  [HEADER, `"${subject}","2026/11/2","10:00:00","2026/11/2","11:00:00","FALSE","佐藤","会議室A","2"`].join("\r\n");
const csvFile = (name: string, content = csvOf("定例会議")) => new File([content], name, { type: "text/csv" });

const rowsOf = (subject: string) => [
  {
    rowNumber: 2,
    subject,
    startDate: "2026/11/2",
    startTime: "10:00:00",
    endDate: "2026/11/2",
    endTime: "11:00:00",
    allDay: "FALSE",
    location: "会議室A",
    showTimeAs: "2",
  },
];

const summary = (overrides: Partial<OutlookScheduleImportSummaryDto> = {}): OutlookScheduleImportSummaryDto => ({
  importedEventCount: 2,
  createdScheduleCount: 3,
  skippedEventCount: 1,
  periodStart: "2026-11-02",
  periodEnd: "2026-11-11",
  errors: [],
  ...overrides,
});

const fileInput = () => screen.getByLabelText("Outlookの予定表CSVファイル");
const pendingTable = () => screen.getByRole("table", { name: "取り込むファイル" });
const pendingRow = (fileName: string) => within(pendingTable()).getByRole("row", { name: new RegExp(fileName) });
const resultRow = (fileName: string) =>
  within(screen.getByRole("table", { name: "インポート結果" })).getByRole("row", { name: new RegExp(fileName) });

async function chooseUser(user: ReturnType<typeof userEvent.setup>, fileName: string, userName: string) {
  await user.click(screen.getByRole("combobox", { name: `${fileName} の取り込み先ユーザー` }));
  await user.click(screen.getByRole("option", { name: userName }));
}

describe("OutlookImportForm（複数ファイルの一括インポート）", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImport.mockResolvedValue({ success: true, data: summary() });
  });

  it("複数のファイルを追加すると、ファイルごとに予定数とファイル名から推定した取り込み先ユーザーを表示すること", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.upload(fileInput(), [csvFile("12345.csv"), csvFile("佐藤花子.csv"), csvFile("calendar.csv")]);

    expect(await screen.findByRole("row", { name: /calendar\.csv/ })).toBeInTheDocument();
    expect(within(pendingRow("12345.csv")).getByText("1件の予定")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "12345.csv の取り込み先ユーザー" })).toHaveTextContent("山田太郎");
    expect(within(pendingRow("12345.csv")).getByText("ファイル名から選択")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "佐藤花子.csv の取り込み先ユーザー" })).toHaveTextContent("佐藤花子");
    expect(screen.getByRole("combobox", { name: "calendar.csv の取り込み先ユーザー" })).toHaveTextContent(
      "ユーザーを選択"
    );
  });

  it("ファイル名が複数のユーザーに当てはまる場合は自動で選ばず、その旨を表示すること", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.upload(fileInput(), [csvFile("12345_23456.csv")]);

    expect(await within(await screen.findByRole("row", { name: /12345_23456\.csv/ })).findByText(
      "候補が複数あります（山田太郎、佐藤花子）"
    )).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "12345_23456.csv の取り込み先ユーザー" })).toHaveTextContent(
      "ユーザーを選択"
    );
  });

  it("ファイルを追加せずにインポートするとエラーを表示すること", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.click(screen.getByRole("button", { name: "インポート" }));

    expect(await screen.findByText("取り込むファイルを追加してください")).toBeInTheDocument();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it("取り込み先ユーザーが未選択のファイルがあると、そのファイルにエラーを表示し、取り込まないこと", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.upload(fileInput(), [csvFile("12345.csv"), csvFile("calendar.csv")]);
    await screen.findByRole("row", { name: /calendar\.csv/ });
    await user.click(screen.getByRole("button", { name: "インポート" }));

    expect(await within(pendingRow("calendar.csv")).findByText("取り込み先のユーザーを選択してください")).toBeInTheDocument();
    expect(within(pendingRow("12345.csv")).queryByText("取り込み先のユーザーを選択してください")).not.toBeInTheDocument();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it("同じユーザーが複数のファイルに割り当てられていると、エラーを表示し、取り込まないこと", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.upload(fileInput(), [csvFile("12345.csv"), csvFile("calendar.csv")]);
    await screen.findByRole("row", { name: /calendar\.csv/ });
    await chooseUser(user, "calendar.csv", "山田太郎");
    await user.click(screen.getByRole("button", { name: "インポート" }));

    expect(
      await within(pendingRow("calendar.csv")).findByText("同じユーザーが複数のファイルに割り当てられています")
    ).toBeInTheDocument();
    expect(within(pendingRow("12345.csv")).getByText("同じユーザーが複数のファイルに割り当てられています")).toBeInTheDocument();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it("読み込めないファイルは理由を表示し、一覧から外すまで取り込まないこと", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.upload(fileInput(), [csvFile("12345.csv"), csvFile("23456.csv", "個人ｺｰﾄﾞ,氏名\nu1,山田")]);

    expect(
      await within(await screen.findByRole("row", { name: /23456\.csv/ })).findByText(
        "Outlookの予定表エクスポート（CSV）の形式ではありません。必要な列（件名、開始日）が見つかりません。"
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "インポート" }));
    expect(await screen.findByText("読み込めないファイルを一覧から外してください")).toBeInTheDocument();
    expect(mockImport).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "23456.csv を一覧から外す" }));
    expect(within(pendingTable()).queryByRole("row", { name: /23456\.csv/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "インポート" }));
    await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1));
  });

  it("全ファイルをファイルごとに順に取り込み、ファイルごとの結果を表示して一覧を空にすること", async () => {
    mockImport
      .mockResolvedValueOnce({ success: true, data: summary() })
      .mockResolvedValueOnce({
        success: true,
        data: summary({
          importedEventCount: 1,
          createdScheduleCount: 1,
          skippedEventCount: 0,
          periodStart: "2026-11-02",
          periodEnd: "2026-11-02",
          errors: [{ rowNumber: 5, message: "開始日が不正です（不明）" }],
        }),
      });
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.upload(fileInput(), [
      csvFile("12345.csv", csvOf("山田さんの会議")),
      csvFile("calendar.csv", csvOf("鈴木さんの会議")),
    ]);
    await screen.findByRole("row", { name: /calendar\.csv/ });
    await chooseUser(user, "calendar.csv", "鈴木一郎");
    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(2));
    expect(mockImport).toHaveBeenNthCalledWith(1, { userId: "12345", rows: rowsOf("山田さんの会議") });
    expect(mockImport).toHaveBeenNthCalledWith(2, { userId: "34567", rows: rowsOf("鈴木さんの会議") });

    expect(await screen.findByRole("table", { name: "インポート結果" })).toBeInTheDocument();
    expect(resultRow("12345.csv")).toHaveTextContent("山田太郎");
    expect(resultRow("12345.csv")).toHaveTextContent("2026/11/02 〜 2026/11/11");
    expect(resultRow("12345.csv")).toHaveTextContent("取り込み 2件・登録 3件・スキップ 1件");
    expect(resultRow("calendar.csv")).toHaveTextContent("鈴木一郎");
    expect(resultRow("calendar.csv")).toHaveTextContent("5行目: 開始日が不正です（不明）");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "スケジュールをインポートしました", description: "2件のファイルを取り込みました" })
    );
    expect(screen.queryByRole("table", { name: "取り込むファイル" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "スケジュールを確認" })).toHaveAttribute("href", "/schedule");
  });

  it("一部のファイルが失敗しても残りを取り込み、失敗したファイルは一覧に残して再試行できること", async () => {
    mockImport
      .mockResolvedValueOnce({ success: false, error: "取り込める予定がありません" })
      .mockRejectedValueOnce(new Error("Body exceeded 1 MB limit"))
      .mockResolvedValueOnce({ success: true, data: summary() });
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.upload(fileInput(), [csvFile("12345.csv"), csvFile("23456.csv"), csvFile("34567.csv")]);
    await screen.findByRole("row", { name: /34567\.csv/ });
    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(3));
    expect(await screen.findByRole("table", { name: "インポート結果" })).toBeInTheDocument();
    expect(resultRow("12345.csv")).toHaveTextContent("取り込める予定がありません");
    expect(resultRow("23456.csv")).toHaveTextContent(
      "送信に失敗しました。ファイルが大きい場合は期間を分けてエクスポートしてください。"
    );
    expect(resultRow("34567.csv")).toHaveTextContent("取り込み 2件・登録 3件・スキップ 1件");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "一部のファイルを取り込めませんでした",
        description: "成功 1件・失敗 2件",
      })
    );

    // 失敗した2ファイルは一覧に残り、成功したファイルは外れる
    expect(within(pendingTable()).getByRole("row", { name: /12345\.csv/ })).toBeInTheDocument();
    expect(within(pendingTable()).getByRole("row", { name: /23456\.csv/ })).toBeInTheDocument();
    expect(within(pendingTable()).queryByRole("row", { name: /34567\.csv/ })).not.toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("同じ名前のファイルを追加し直すと、一覧の同じファイルを置き換えること", async () => {
    const user = userEvent.setup();
    render(<OutlookImportForm users={users} />);

    await user.upload(fileInput(), [csvFile("12345.csv", csvOf("古い予定"))]);
    await screen.findByRole("row", { name: /12345\.csv/ });
    await user.upload(fileInput(), [csvFile("12345.csv", csvOf("新しい予定"))]);
    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1));
    expect(mockImport).toHaveBeenCalledWith({ userId: "12345", rows: rowsOf("新しい予定") });
  });
});
