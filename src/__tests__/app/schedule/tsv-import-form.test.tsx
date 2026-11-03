import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/app/schedule/actions", () => ({
  importScheduleTsv: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

import { TsvImportForm } from "@/app/schedule/import/_components/tsv-import-form";
import { importScheduleTsv } from "@/app/schedule/actions";
import { toast } from "@/hooks/use-toast";

const mockImport = importScheduleTsv as jest.Mock;

const TSV = [
  "個人ｺｰﾄﾞ\t氏名\t登録区分\t年月日\t開始時間\t終了時間\tﾀｲﾄﾙ\t場所\t内容",
  "u1\t山田太郎\t\t2026/11/02 00:00:00\t09:00\t10:00\t会議\t会議室\t定例",
].join("\r\n");

describe("TsvImportForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImport.mockResolvedValue({ success: true, data: undefined });
  });

  it("TSVファイルを選ぶと全行を取り込み、スケジュール画面へ遷移すること", async () => {
    const user = userEvent.setup();
    render(<TsvImportForm />);

    await user.upload(
      screen.getByLabelText("スケジュールTSVファイル"),
      new File([TSV], "userSchedule.txt", { type: "text/plain" })
    );

    await waitFor(() => {
      expect(mockImport).toHaveBeenCalledWith([
        {
          "個人ｺｰﾄﾞ": "u1",
          "氏名": "山田太郎",
          "登録区分": "",
          "年月日": "2026/11/02 00:00:00",
          "開始時間": "09:00",
          "終了時間": "10:00",
          "ﾀｲﾄﾙ": "会議",
          "場所": "会議室",
          "内容": "定例",
        },
      ]);
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "スケジュールのインポートに成功しました" }));
    expect(mockPush).toHaveBeenCalledWith("/schedule");
  });

  it("タブ区切りではないファイルはエラーを通知し、取り込まないこと", async () => {
    const user = userEvent.setup();
    render(<TsvImportForm />);

    await user.upload(
      screen.getByLabelText("スケジュールTSVファイル"),
      new File(["件名,開始日\n会議,2026/11/2"], "calendar.txt", { type: "text/plain" })
    );

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive", description: "ファイルの形式が正しくありません" })
      );
    });
    expect(mockImport).not.toHaveBeenCalled();
  });

  it("取り込みに失敗した場合はエラーを通知し、遷移しないこと", async () => {
    mockImport.mockResolvedValue({ success: false, error: "入力値が不正です。" });
    const user = userEvent.setup();
    render(<TsvImportForm />);

    await user.upload(
      screen.getByLabelText("スケジュールTSVファイル"),
      new File([TSV], "userSchedule.txt", { type: "text/plain" })
    );

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive", description: "入力値が不正です。" })
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
