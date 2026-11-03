import {
  EVM_VIEW_DEFAULTS_BY_REVIEW_CYCLE,
  DEFAULT_PROGRESS_REVIEW_CYCLE,
} from "@/types/progress-review-cycle";
import { withProjectSettingsDefaults } from "@/types/project-settings";

/**
 * 進捗確認サイクル（日次／週次／月次）。
 * 案件ごとに進捗会議の頻度が異なるため、EVMグラフの既定の間隔・表示期間をサイクルから決める。
 */
describe("progress-review-cycle", () => {
  it("既定のサイクルは週次（従来のEVMダッシュボード既定値と同じ）", () => {
    expect(DEFAULT_PROGRESS_REVIEW_CYCLE).toBe("WEEKLY");
    expect(withProjectSettingsDefaults("p1", null).progressReviewCycle).toBe(
      "WEEKLY"
    );
  });

  it("日次は日次間隔・過去1ヶ月", () => {
    expect(EVM_VIEW_DEFAULTS_BY_REVIEW_CYCLE.DAILY).toEqual({
      interval: "daily",
      periodMode: "recent1month",
    });
  });

  it("週次は週次間隔・プロジェクト全期間（従来の既定値）", () => {
    expect(EVM_VIEW_DEFAULTS_BY_REVIEW_CYCLE.WEEKLY).toEqual({
      interval: "weekly",
      periodMode: "project",
    });
  });

  it("月次は月次間隔・プロジェクト全期間", () => {
    expect(EVM_VIEW_DEFAULTS_BY_REVIEW_CYCLE.MONTHLY).toEqual({
      interval: "monthly",
      periodMode: "project",
    });
  });

  it("設定値があればそれを使う", () => {
    expect(
      withProjectSettingsDefaults("p1", { progressReviewCycle: "DAILY" })
        .progressReviewCycle
    ).toBe("DAILY");
  });
});
