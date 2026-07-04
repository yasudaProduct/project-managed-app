import { test, expect } from "@playwright/test";

// シードデータ（prisma/mock-data.ts: ganttv3-test / wbsId=8 = mockDataGanttV3）に依存する。
// この WBS は ganttv3 表示検証用で、タスク・依存関係・マイルストーンを含む。
// （test-project-1 / wbsId=1 は wbsTask が空のため、タスクバー検証には使えない）
// ローカルで `npm run dev`（実DB）を起動した状態で `npm run test:e2e` を実行する。
const GANTT_V3_PATH = "/projects/ganttv3-test/ganttv3";

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

  test("編集モードでタスクバーをドラッグすると位置が右へ動く", async ({
    page,
  }) => {
    await expect(page.getByTestId("ganttv3-chart")).toBeVisible({
      timeout: 15000,
    });

    // タスクの非同期ロード完了（＝バー描画）を待つ。
    // バー描画前に編集モードへ入るとドラフトが空スナップショットになり、
    // 以降タスクが読み込まれてもチャートが空のままになるため必須。
    await expect(page.locator("[data-task-id]").first()).toBeVisible({
      timeout: 15000,
    });

    // 編集モードに入る（編集モードのみバーがドラッグ可能）
    await page.getByTestId("ganttv3-edit-toggle").click();
    await expect(page.getByTestId("ganttv3-edit-save")).toBeVisible();

    // 最初のタスクバーを取得
    const bar = page.locator("[data-task-id]").first();
    await expect(bar).toBeVisible();
    const before = await bar.boundingBox();
    if (!before) throw new Error("タスクバーが見つかりません");

    // バー中心から右へ十分な距離ドラッグ
    await page.mouse.move(
      before.x + before.width / 2,
      before.y + before.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      before.x + before.width / 2 + 120,
      before.y + before.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();

    // 位置が右へ動いたことを確認
    await expect
      .poll(async () => (await bar.boundingBox())?.x ?? before.x)
      .toBeGreaterThan(before.x);
  });
});
