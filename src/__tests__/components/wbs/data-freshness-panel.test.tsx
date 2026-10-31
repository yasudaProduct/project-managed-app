import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DataFreshnessPanel } from "@/components/wbs/data-freshness-panel";
import type { DataFreshnessDto } from "@/applications/data-freshness/data-freshness-application-service";

const makeFreshness = (overrides: Partial<DataFreshnessDto> = {}): DataFreshnessDto => ({
  lastWbsSync: { syncedAt: "2026-10-31T00:00:00.000Z", status: "SUCCESS" },
  entryCheck: {
    windowStart: "2026-10-19T00:00:00.000Z",
    windowEnd: "2026-10-30T00:00:00.000Z",
    assignees: [
      {
        userId: "u1",
        name: "山田",
        lastRecordDate: "2026-10-30T00:00:00.000Z",
        missingDates: [],
      },
      {
        userId: "u2",
        name: "佐藤",
        lastRecordDate: "2026-10-27T00:00:00.000Z",
        missingDates: ["2026-10-28T00:00:00.000Z", "2026-10-30T00:00:00.000Z"],
      },
    ],
  },
  taskIssues: { noAssigneeCount: 1, noBaselineCount: 0, zeroProgressInProgressCount: 2 },
  ...overrides,
});

describe("DataFreshnessPanel", () => {
  it("入力漏れのある担当者と日付、件数を表示する", () => {
    render(<DataFreshnessPanel freshness={makeFreshness()} />);

    expect(screen.getByText(/入力漏れ 1人/)).toBeInTheDocument();
    const row = screen.getByText("佐藤").closest("tr")!;
    expect(row).toHaveTextContent("2日");
    expect(row).toHaveTextContent("10/28");
    expect(row).toHaveTextContent("10/30");
    expect(screen.queryByText("山田")).not.toBeInTheDocument();
  });

  it("入力漏れがなければその旨を表示する", () => {
    render(
      <DataFreshnessPanel
        freshness={makeFreshness({
          entryCheck: { ...makeFreshness().entryCheck, assignees: [] },
        })}
      />
    );

    expect(screen.getByText(/入力漏れはありません/)).toBeInTheDocument();
  });

  it("タスクデータの不備は件数のあるものだけ表示する", () => {
    render(<DataFreshnessPanel freshness={makeFreshness()} />);

    expect(screen.getByText("担当者未設定 1件")).toBeInTheDocument();
    expect(screen.getByText("着手中で進捗率0% 2件")).toBeInTheDocument();
    expect(screen.queryByText(/基準工数未設定/)).not.toBeInTheDocument();
  });

  it("同期履歴がなければ未同期と表示する", () => {
    render(<DataFreshnessPanel freshness={makeFreshness({ lastWbsSync: null })} />);

    expect(screen.getByText(/WBS同期: 履歴なし/)).toBeInTheDocument();
  });
});
