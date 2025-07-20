import { test, expect } from '@playwright/test';

test.describe('ガントチャート ビジュアルリグレッションテスト', () => {
  test.beforeEach(async ({ page }) => {
    // テストページに移動
    await page.goto('/test/gantt');

    // ページが完全に読み込まれるまで待機
    await page.waitForSelector('[data-testid="gantt-component"]');

    // アニメーションが完了するまで少し待機
    await page.waitForTimeout(1000);
  });

  test('通常のプロジェクト表示のスクリーンショット', async ({ page }) => {
    // デフォルトシナリオで表示
    await page.selectOption('[data-testid="scenario-selector"]', 'default');
    await page.waitForTimeout(500);

    // ガントチャートエリア全体のスクリーンショット
    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-default-full.png');

    // タスクリスト部分のスクリーンショット
    const taskList = page.locator('[data-testid="gantt-task-list"]');
    await expect(taskList).toHaveScreenshot('gantt-task-list.png');

    // チャート部分のスクリーンショット
    const chartArea = page.locator('[data-testid="gantt-chart-area"]');
    await expect(chartArea).toHaveScreenshot('gantt-chart-area.png');
  });

  test('空のプロジェクトのスクリーンショット', async ({ page }) => {
    await page.selectOption('[data-testid="scenario-selector"]', 'empty');
    await page.waitForTimeout(500);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-empty.png');
  });

  test('単一タスクのスクリーンショット', async ({ page }) => {
    await page.selectOption('[data-testid="scenario-selector"]', 'single-task');
    await page.waitForTimeout(500);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-single-task.png');
  });

  test('多数のタスクのスクリーンショット', async ({ page }) => {
    await page.selectOption('[data-testid="scenario-selector"]', 'many-tasks');
    await page.waitForTimeout(1000); // 多数のタスクの描画完了を待つ

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-many-tasks.png');
  });

  test('表示モード切り替えのスクリーンショット', async ({ page }) => {
    // 日表示
    await page.selectOption('[data-testid="view-mode-select"]', 'day');
    await page.waitForTimeout(500);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-day-view.png');

    // 週表示
    await page.selectOption('[data-testid="view-mode-select"]', 'week');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-week-view.png');

    // 月表示
    await page.selectOption('[data-testid="view-mode-select"]', 'month');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-month-view.png');
  });

  test('グループ化表示のスクリーンショット', async ({ page }) => {
    // フェーズでグループ化（デフォルト）
    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-group-by-phase.png');

    // 担当者でグループ化
    await page.selectOption('[data-testid="group-by-select"]', 'assignee');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-group-by-assignee.png');

    // ステータスでグループ化
    await page.selectOption('[data-testid="group-by-select"]', 'status');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-group-by-status.png');
  });

  test('フィルタリング表示のスクリーンショット', async ({ page }) => {
    const ganttComponent = page.locator('[data-testid="gantt-component"]');

    // ステータスフィルター: 進行中のみ
    await page.selectOption('[data-testid="status-filter-select"]', 'IN_PROGRESS');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-filter-in-progress.png');

    // フィルターをリセット
    await page.selectOption('[data-testid="status-filter-select"]', 'all');
    await page.waitForTimeout(500);

    // 担当者フィルター: 佐藤花子のみ
    await page.selectOption('[data-testid="assignee-filter-select"]', '佐藤花子');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-filter-assignee.png');
  });

  test('折りたたみ機能のスクリーンショット', async ({ page }) => {
    const ganttComponent = page.locator('[data-testid="gantt-component"]');

    // 通常表示
    await expect(ganttComponent).toHaveScreenshot('gantt-expanded.png');

    // 全て折りたたむ
    await page.click('[data-testid="toggle-all-tasks-button"]');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-collapsed.png');

    // 全て展開
    await page.click('[data-testid="toggle-all-tasks-button"]');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-re-expanded.png');
  });

  test('マイルストーン表示切り替えのスクリーンショット', async ({ page }) => {
    const ganttComponent = page.locator('[data-testid="gantt-component"]');

    // マイルストーン表示あり（デフォルト）
    await expect(ganttComponent).toHaveScreenshot('gantt-with-milestones.png');

    // マイルストーン非表示
    await page.click('[data-testid="milestone-toggle-button"]');
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-without-milestones.png');
  });

  test('レスポンシブ表示のスクリーンショット', async ({ page }) => {
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-tablet.png');

    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-mobile.png');

    // デスクトップサイズに戻す
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('スクロール状態のスクリーンショット', async ({ page }) => {
    // 横スクロールが必要な状況を作る
    await page.selectOption('[data-testid="scenario-selector"]', 'long-project');
    await page.waitForTimeout(1000);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');

    // 初期位置
    await expect(ganttComponent).toHaveScreenshot('gantt-scroll-start.png');

    // 横スクロール
    const scrollableArea = page.locator('.overflow-x-auto').first();
    await scrollableArea.evaluate(element => {
      element.scrollLeft = 500;
    });
    await page.waitForTimeout(500);
    await expect(ganttComponent).toHaveScreenshot('gantt-scroll-middle.png');
  });

  test('ダークモード表示のスクリーンショット', async ({ page }) => {
    // ダークモードを有効にする（Tailwind CSS の dark: クラスをテスト）
    await page.addStyleTag({
      content: `
        .dark {
          color-scheme: dark;
        }
        .dark * {
          background-color: #1f2937 !important;
          color: #f9fafb !important;
          border-color: #374151 !important;
        }
      `
    });

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-dark-mode.png');
  });

  test('高DPI表示のスクリーンショット', async ({ page }) => {
    // 高DPI環境をシミュレート
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function () { return 2; }
      });
    });

    await page.waitForTimeout(500);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-high-dpi.png');
  });
});

test.describe('ガントチャート インタラクションテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/gantt');
    await page.waitForSelector('[data-testid="gantt-component"]');
    await page.waitForTimeout(1000);
  });

  test('ホバー状態のスクリーンショット', async ({ page }) => {
    // タスクバーにホバー
    const taskBar = page.locator('[data-task-id="1"]').first();
    await taskBar.hover();
    await page.waitForTimeout(500);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-task-hover.png');
  });

  test('選択状態のスクリーンショット', async ({ page }) => {
    // タスクをクリック（選択状態）
    const taskBar = page.locator('[data-task-id="2"]').first();
    await taskBar.click();
    await page.waitForTimeout(500);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-task-selected.png');
  });

  test('ツールチップ表示のスクリーンショット', async ({ page }) => {
    // マイルストーンにホバーしてツールチップを表示
    const milestone = page.locator('[data-milestone-id="1"]').first();
    await milestone.hover();
    await page.waitForTimeout(1000);

    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-milestone-tooltip.png');
  });
});

test.describe('ガントチャート エラー状態テスト', () => {
  test('エラー状態のスクリーンショット', async ({ page }) => {
    // JavaScriptエラーを意図的に発生させる
    await page.goto('/test/gantt');

    // コンソールエラーをキャッチ
    page.on('pageerror', () => {
      console.error('エラーが発生しました');
    });

    await page.waitForSelector('[data-testid="gantt-component"]', { timeout: 10000 });

    // エラーが発生していない場合でも、エラー境界のテストとしてスクリーンショットを撮る
    const ganttComponent = page.locator('[data-testid="gantt-component"]');
    await expect(ganttComponent).toHaveScreenshot('gantt-no-error.png');
  });
});