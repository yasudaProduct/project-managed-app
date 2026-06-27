import { test, expect } from "@playwright/test";

// シードデータ（prisma/seed.ts: test-project-1 / wbsId=1）に依存する。
// ローカルで `npm run dev`（実DB）を起動した状態で `npm run test:e2e` を実行する。
const GANTT_V3_PATH = "/projects/test-project-1/ganttv3";

test.describe("ganttv3", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GANTT_V3_PATH);
  });

  test("初期表示でガントチャートが表示される", async ({ page }) => {
    await expect(page.getByTestId("ganttv3-chart")).toBeVisible({
      timeout: 15000,
    });
  });

  test("ビュー切替: ガント ↔ テーブル", async ({ page }) => {
    // 初期はガント表示
    await expect(page.getByTestId("ganttv3-chart")).toBeVisible({
      timeout: 15000,
    });

    // テーブルへ切替 → ガントが消える
    await page.getByTestId("view-switcher-table").click();
    await expect(page.getByTestId("ganttv3-chart")).toBeHidden();

    // ガントへ戻す → 再表示
    await page.getByTestId("view-switcher-gantt").click();
    await expect(page.getByTestId("ganttv3-chart")).toBeVisible();
  });
});
