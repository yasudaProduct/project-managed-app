import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProgressHistoryContent } from "@/components/wbs/progress-history-content";
import type { EditableProgressSnapshotData } from "@/app/wbs/[id]/progress-history-actions";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/app/wbs/[id]/progress-history-actions", () => ({
  updateProgressSnapshot: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

import { updateProgressSnapshot } from "@/app/wbs/[id]/progress-history-actions";

const mockUpdate = updateProgressSnapshot as jest.Mock;

// jsdom に無い API（Radix Popover が要求）をスタブ
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

function makeSnapshot(
  overrides: Partial<EditableProgressSnapshotData> = {}
): EditableProgressSnapshotData {
  return {
    id: 1,
    taskId: 10,
    taskNo: "D1-0001",
    taskName: "設計タスク",
    snapshotAt: "2025-07-01T03:00:00.000Z",
    progressRate: 30,
    status: "IN_PROGRESS",
    source: "sync",
    ...overrides,
  };
}

const baseSnapshots: EditableProgressSnapshotData[] = [
  makeSnapshot({ id: 1, snapshotAt: "2025-07-01T03:00:00.000Z", progressRate: 30 }),
  makeSnapshot({ id: 2, snapshotAt: "2025-07-02T03:00:00.000Z", progressRate: 50 }),
  makeSnapshot({
    id: 3,
    taskId: 11,
    taskNo: "D1-0002",
    taskName: "実装タスク",
    snapshotAt: "2025-07-02T03:00:00.000Z",
    progressRate: 10,
    status: "NOT_STARTED",
    source: "manual",
  }),
];

function setup(snapshots = baseSnapshots) {
  return render(
    <ProgressHistoryContent wbsId={1} wbsName="テストWBS" snapshots={snapshots} />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue({ success: true });
});

describe("ProgressHistoryContent（マトリクス表示）", () => {
  it("タスク行と日付列のマトリクスを表示する", () => {
    setup();
    // 行（タスク）
    expect(screen.getByText("D1-0001")).toBeInTheDocument();
    expect(screen.getByText("設計タスク")).toBeInTheDocument();
    expect(screen.getByText("D1-0002")).toBeInTheDocument();
    // サマリ（2タスク・3記録）
    expect(screen.getByText(/2 \/ 2 タスク・3 記録/)).toBeInTheDocument();
    // セル値（その日の進捗率）
    expect(screen.getByRole("button", { name: /^30/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^50/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^10/ })).toBeInTheDocument();
  });

  it("タスクNo・タスク名で行を絞り込める", () => {
    setup();
    fireEvent.change(
      screen.getByPlaceholderText("タスクNo・タスク名で絞り込み"),
      { target: { value: "実装" } }
    );
    expect(screen.queryByText("設計タスク")).not.toBeInTheDocument();
    expect(screen.getByText("実装タスク")).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2 タスク/)).toBeInTheDocument();
  });

  it("セルをクリックすると編集ポップオーバーが開き、値を変更して保存できる", async () => {
    setup();
    // 7/2 の設計タスクのセル（50%）を開く
    fireEvent.click(screen.getByRole("button", { name: /^50/ }));

    const input = await screen.findByRole("spinbutton");
    expect(input).toHaveValue(50);

    fireEvent.change(input, { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        wbsId: 1,
        id: 2,
        progressRate: 80,
        status: "IN_PROGRESS",
      });
    });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("変更すると一括保存に件数が表示され、まとめて保存できる", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^50/ }));
    const input = await screen.findByRole("spinbutton");
    fireEvent.change(input, { target: { value: "90" } });

    const bulkButton = screen.getByRole("button", { name: /一括保存 \(1\)/ });
    fireEvent.click(bulkButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, progressRate: 90 })
      );
    });
  });

  it("進捗率が範囲外なら保存せずエラートーストを出す", async () => {
    const { toast } = jest.requireMock("@/hooks/use-toast");
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^50/ }));
    const input = await screen.findByRole("spinbutton");
    fireEvent.change(input, { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "入力エラー" })
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("手動記録のポップオーバーには「手動」バッジが表示される", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^10/ }));
    expect(await screen.findByText("手動")).toBeInTheDocument();
  });

  it("スナップショットが無い場合は空メッセージを表示する", () => {
    setup([]);
    expect(
      screen.getByText(/訂正対象のスナップショットがありません/)
    ).toBeInTheDocument();
  });
});
