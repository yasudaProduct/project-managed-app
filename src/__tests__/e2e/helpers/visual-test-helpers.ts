import { Page, Locator, expect } from '@playwright/test';

/**
 * ビジュアルテスト用のヘルパー関数
 */

export interface ScreenshotOptions {
  /**
   * スクリーンショットを撮る前の待機時間（ミリ秒）
   */
  waitTime?: number;
  /**
   * アニメーションを無効にするかどうか
   */
  disableAnimations?: boolean;
  /**
   * フルページスクリーンショットを撮るかどうか
   */
  fullPage?: boolean;
  /**
   * スクリーンショットの閾値（0-1）
   */
  threshold?: number;
  /**
   * マスクする要素のセレクター
   */
  mask?: string[];
}

/**
 * ガントチャートコンポーネントの基本設定
 */
export class GanttVisualTestHelper {
  constructor(private page: Page) {}

  /**
   * ガントチャートテストページに移動
   */
  async navigateToTestPage(): Promise<void> {
    await this.page.goto('/test/gantt');
    await this.page.waitForSelector('[data-testid="gantt-component"]');
    
    // アニメーションが完了するまで待機
    await this.page.waitForTimeout(1000);
  }

  /**
   * テストシナリオを選択
   */
  async selectScenario(scenario: string): Promise<void> {
    await this.page.selectOption('[data-testid="scenario-selector"]', scenario);
    await this.page.waitForTimeout(500);
  }

  /**
   * アニメーションを無効化
   */
  async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  }

  /**
   * ガントチャートコンポーネントのスクリーンショットを撮影
   */
  async takeGanttScreenshot(
    name: string, 
    options: ScreenshotOptions = {}
  ): Promise<void> {
    const {
      waitTime = 500,
      disableAnimations = true,
      fullPage = false,
      threshold = 0.2,
      mask = []
    } = options;

    // アニメーション無効化
    if (disableAnimations) {
      await this.disableAnimations();
    }

    // 待機時間
    if (waitTime > 0) {
      await this.page.waitForTimeout(waitTime);
    }

    // マスク要素を設定
    const maskLocators = mask.map(selector => this.page.locator(selector));

    const ganttComponent = this.page.locator('[data-testid="gantt-component"]');
    
    await expect(ganttComponent).toHaveScreenshot(`${name}.png`, {
      threshold,
      fullPage,
      mask: maskLocators
    });
  }

  /**
   * 表示モードを変更
   */
  async changeViewMode(mode: 'day' | 'week' | 'month' | 'quarter'): Promise<void> {
    const modeText = {
      day: '日',
      week: '週', 
      month: '月',
      quarter: '四半期'
    };

    await this.page.click(`text=${modeText[mode]}`);
    await this.page.waitForTimeout(500);
  }

  /**
   * グループ化を変更
   */
  async changeGroupBy(groupBy: 'phase' | 'assignee' | 'status' | 'none'): Promise<void> {
    await this.page.selectOption('select:has-text("フェーズ")', groupBy);
    await this.page.waitForTimeout(500);
  }

  /**
   * フィルターを設定
   */
  async setStatusFilter(status: string): Promise<void> {
    await this.page.selectOption('select >> nth=1', status);
    await this.page.waitForTimeout(500);
  }

  async setAssigneeFilter(assignee: string): Promise<void> {
    await this.page.selectOption('select >> nth=2', assignee);
    await this.page.waitForTimeout(500);
  }

  /**
   * 折りたたみ操作
   */
  async collapseAll(): Promise<void> {
    await this.page.click('text=全て折りたたむ');
    await this.page.waitForTimeout(500);
  }

  async expandAll(): Promise<void> {
    await this.page.click('text=全て展開');
    await this.page.waitForTimeout(500);
  }

  /**
   * マイルストーン表示切り替え
   */
  async toggleMilestones(show: boolean): Promise<void> {
    const checkbox = this.page.locator('input[type="checkbox"]:near(:text("マイルストーン"))');
    
    if (show) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * スクロール位置を設定
   */
  async scrollHorizontally(scrollLeft: number): Promise<void> {
    const scrollableArea = this.page.locator('.overflow-x-auto').first();
    await scrollableArea.evaluate((element, scrollLeft) => {
      element.scrollLeft = scrollLeft;
    }, scrollLeft);
    await this.page.waitForTimeout(500);
  }

  /**
   * 画面サイズを変更
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
    await this.page.waitForTimeout(500);
  }

  /**
   * タスクバーにホバー
   */
  async hoverTask(taskId: number): Promise<void> {
    const taskBar = this.page.locator(`[data-task-id="${taskId}"]`).first();
    await taskBar.hover();
    await this.page.waitForTimeout(500);
  }

  /**
   * タスクバーをクリック
   */
  async clickTask(taskId: number): Promise<void> {
    const taskBar = this.page.locator(`[data-task-id="${taskId}"]`).first();
    await taskBar.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * マイルストーンにホバー
   */
  async hoverMilestone(milestoneId: number): Promise<void> {
    const milestone = this.page.locator(`[data-milestone-id="${milestoneId}"]`).first();
    await milestone.hover();
    await this.page.waitForTimeout(1000); // ツールチップ表示待機
  }

  /**
   * 比較用のベースラインスクリーンショットを撮影
   */
  async takeBaselineScreenshots(): Promise<void> {
    // 基本的なシナリオのスクリーンショットを撮影
    const scenarios = [
      { name: 'default', label: 'デフォルト' },
      { name: 'empty', label: '空' },
      { name: 'single-task', label: '単一タスク' },
      { name: 'many-tasks', label: '多数タスク' }
    ];

    for (const scenario of scenarios) {
      await this.selectScenario(scenario.name);
      await this.takeGanttScreenshot(`baseline-${scenario.name}`);
    }

    // 表示モードのスクリーンショット
    await this.selectScenario('default');
    
    const viewModes: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];
    for (const mode of viewModes) {
      await this.changeViewMode(mode);
      await this.takeGanttScreenshot(`baseline-${mode}-view`);
    }
  }

  /**
   * レスポンシブテスト用のスクリーンショット
   */
  async takeResponsiveScreenshots(name: string): Promise<void> {
    const viewports = [
      { width: 1920, height: 1080, suffix: 'desktop' },
      { width: 1280, height: 720, suffix: 'laptop' },
      { width: 768, height: 1024, suffix: 'tablet' },
      { width: 375, height: 667, suffix: 'mobile' }
    ];

    for (const viewport of viewports) {
      await this.setViewportSize(viewport.width, viewport.height);
      await this.takeGanttScreenshot(`${name}-${viewport.suffix}`);
    }

    // デスクトップサイズに戻す
    await this.setViewportSize(1280, 720);
  }

  /**
   * テーマテスト用のスクリーンショット
   */
  async takeThemeScreenshots(name: string): Promise<void> {
    // ライトテーマ
    await this.takeGanttScreenshot(`${name}-light`);

    // ダークテーマ
    await this.page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await this.page.addStyleTag({
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
    await this.page.waitForTimeout(500);
    await this.takeGanttScreenshot(`${name}-dark`);

    // ダークモードを解除
    await this.page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
  }

  /**
   * ページ全体のパフォーマンス測定
   */
  async measurePerformance(): Promise<{ [key: string]: number }> {
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      };
    });

    return performanceMetrics;
  }
}

/**
 * スクリーンショット比較のユーティリティ
 */
export class ScreenshotComparison {
  constructor(private page: Page) {}

  /**
   * 2つのスクリーンショットを比較
   */
  async compareScreenshots(
    baseline: string,
    current: string,
    threshold: number = 0.1
  ): Promise<boolean> {
    // Playwrightの組み込み比較機能を使用
    const ganttComponent = this.page.locator('[data-testid="gantt-component"]');
    
    try {
      await expect(ganttComponent).toHaveScreenshot(`${current}.png`, {
        threshold
      });
      return true;
    } catch (error) {
      console.log(`Screenshot comparison failed: ${error}`);
      return false;
    }
  }

  /**
   * 差分画像を生成
   */
  async generateDiffImage(baseline: string, current: string): Promise<string> {
    // この機能はPlaywrightが自動的に提供
    return `${current}-diff.png`;
  }
}