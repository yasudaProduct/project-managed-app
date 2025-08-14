import { test, expect } from '@playwright/test';

test.describe('ガントチャートのドラッグ機能（シンプル版）', () => {
  test('タスクバーの位置と日付の関係を検証', async ({ page }) => {
    // ガントチャートページに直接遷移
    await page.goto('/wbs/1/ganttv2');
    
    // ガントチャートが表示されるまで待機
    await page.waitForSelector('[data-testid="gantt-chart-area"]', { timeout: 10000 });
    
    // タスクバーが表示されるまで待機
    const taskBar = page.locator('[data-task-id]').first();
    await expect(taskBar).toBeVisible({ timeout: 10000 });
    
    // デバッグ情報の収集
    const debugInfo = await page.evaluate(() => {
      const taskElement = document.querySelector('[data-task-id]');
      const chartArea = document.querySelector('[data-testid="gantt-chart-area"]');
      const chartContainer = chartArea?.querySelector('.relative[style*="width"]');
      
      if (!taskElement || !chartContainer) {
        return null;
      }
      
      const taskStyle = window.getComputedStyle(taskElement);
      const containerStyle = (chartContainer as HTMLElement).style;
      
      // タイトル属性から日付を抽出
      const title = taskElement.getAttribute('title') || '';
      const dateMatch = title.match(/\((\d{4}\/\d{2}\/\d{2}) - (\d{4}\/\d{2}\/\d{2})\)/);
      
      return {
        taskLeft: taskStyle.left,
        taskWidth: taskStyle.width,
        containerWidth: containerStyle.width,
        title: title,
        startDate: dateMatch?.[1],
        endDate: dateMatch?.[2],
        taskId: taskElement.getAttribute('data-task-id'),
      };
    });
    
    console.log('デバッグ情報:', debugInfo);
    
    // 初期位置を記録
    const initialBox = await taskBar.boundingBox();
    console.log('初期バウンディングボックス:', initialBox);
    
    // ドラッグ操作（50ピクセル右に移動）
    const dragDistance = 50;
    await taskBar.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + initialBox!.width / 2 + dragDistance, initialBox!.y + initialBox!.height / 2);
    await page.mouse.up();
    
    // 更新を待つ
    await page.waitForTimeout(2000);
    
    // 更新後の情報を取得
    const updatedDebugInfo = await page.evaluate(() => {
      const taskElement = document.querySelector('[data-task-id]');
      const title = taskElement?.getAttribute('title') || '';
      const dateMatch = title.match(/\((\d{4}\/\d{2}\/\d{2}) - (\d{4}\/\d{2}\/\d{2})\)/);
      const taskStyle = window.getComputedStyle(taskElement!);
      
      return {
        taskLeft: taskStyle.left,
        startDate: dateMatch?.[1],
        endDate: dateMatch?.[2],
        title: title,
      };
    });
    
    console.log('更新後の情報:', updatedDebugInfo);
    
    // 日付の差分を計算
    if (debugInfo?.startDate && updatedDebugInfo.startDate) {
      const initialDate = new Date(debugInfo.startDate.replace(/\//g, '-'));
      const updatedDate = new Date(updatedDebugInfo.startDate.replace(/\//g, '-'));
      const daysDiff = Math.round((updatedDate.getTime() - initialDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('ドラッグ距離:', dragDistance, 'px');
      console.log('日付の変化:', daysDiff, '日');
      console.log('ピクセル/日:', dragDistance / daysDiff);
      
      // チャート幅から1日あたりのピクセル数を計算
      const chartWidth = parseInt(debugInfo.containerWidth);
      console.log('チャート幅:', chartWidth, 'px');
    }
    
    // 位置が変わったことを確認
    const updatedBox = await taskBar.boundingBox();
    expect(updatedBox?.x).toBeGreaterThan(initialBox!.x);
  });
});