import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MilestoneManagement from "@/components/milestone/milestone-management";
import type { MilestoneForecastDto } from "@/applications/milestone/milestone-application-service";

jest.mock("@/app/wbs/[id]/actions/milestone-actions", () => ({
  deleteMilestone: jest.fn(),
  createMilestone: jest.fn(),
  updateMilestone: jest.fn(),
}));

const makeForecast = (overrides: Partial<MilestoneForecastDto>): MilestoneForecastDto => ({
  id: 1,
  name: "設計完了",
  date: "2026-11-20T00:00:00.000Z",
  targetType: "PHASE",
  phaseId: 3,
  taskIds: [],
  achievedAt: null,
  status: "AT_RISK",
  forecastDate: "2026-11-25T00:00:00.000Z",
  delayDays: 5,
  completedCount: 1,
  totalCount: 2,
  brokenLinkCount: 0,
  ...overrides,
});

describe("MilestoneManagement", () => {
  it("対象・達成見込み・見込み日・紐付け切れを表示する", () => {
    render(
      <MilestoneManagement
        wbsId={10}
        initialMilestones={[
          makeForecast({}),
          makeForecast({
            id: 2,
            name: "中間リリース",
            targetType: "TASKS",
            phaseId: null,
            taskIds: [5, 99],
            forecastDate: "2026-11-15T00:00:00.000Z",
            totalCount: 1,
            completedCount: 0,
            brokenLinkCount: 1,
          }),
          makeForecast({
            id: 3,
            name: "顧客レビュー",
            targetType: "EVENT",
            phaseId: null,
            status: "OVERDUE",
            forecastDate: null,
            delayDays: 1,
            totalCount: 0,
            completedCount: 0,
          }),
        ]}
        phases={[{ id: 3, name: "設計" }]}
        tasks={[]}
      />
    );

    const design = screen.getByRole("row", { name: /設計完了/ });
    expect(design).toHaveTextContent("フェーズ: 設計");
    expect(design).toHaveTextContent("遅延見込み");
    expect(design).toHaveTextContent("5日遅れ");
    expect(design).toHaveTextContent("1 / 2 完了");

    const release = screen.getByRole("row", { name: /中間リリース/ });
    expect(release).toHaveTextContent("タスク指定");
    expect(release).toHaveTextContent("紐付け切れ 1件");

    const review = screen.getByRole("row", { name: /顧客レビュー/ });
    expect(review).toHaveTextContent("イベント");
    expect(review).toHaveTextContent("期限超過");
  });
});
