import { test, expect, Page } from '@playwright/test';

test.describe('ガントチャートのドラッグ機能', () => {
  test.beforeEach(async ({ page }) => {
    // ガントチャートページに直接遷移
    await page.goto('/wbs/1/ganttv2');
    
    // ガントチャートが表示されるまで待機
    await page.waitForSelector('[data-testid="gantt-chart-area"]', { timeout: 10000 });
  });

  test('タスクバーをドラッグして日付を変更', async ({ page }) => {
    // 最初のタスクバーを見つける
    const taskBar = page.locator('[data-task-id]').first();
    
    // タスクバーが表示されるまで待機
    await expect(taskBar).toBeVisible();
    
    // タスクバーの初期位置を取得
    const initialBox = await taskBar.boundingBox();
    if (!initialBox) throw new Error('タスクバーが見つかりません');
    
    console.log('初期位置:', initialBox.x);
    
    // タスクバーのtitle属性から現在の日付を取得
    const initialTitle = await taskBar.getAttribute('title');
    console.log('初期タイトル:', initialTitle);
    
    // 日付を抽出（例: "タスク名 (2024/01/01 - 2024/01/05) - ドラッグで移動、クリックで編集"）
    const dateMatch = initialTitle?.match(/\((\d{4}\/\d{2}\/\d{2}) - (\d{4}\/\d{2}\/\d{2})\)/);
    const initialStartDate = dateMatch?.[1];
    const initialEndDate = dateMatch?.[2];
    
    console.log('初期開始日:', initialStartDate);
    console.log('初期終了日:', initialEndDate);
    
    // ドラッグ操作を実行（右に100ピクセル移動）
    const dragDistance = 100;
    await taskBar.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox.x + initialBox.width / 2 + dragDistance, initialBox.y + initialBox.height / 2);
    await page.mouse.up();
    
    // 更新完了を待機
    await page.waitForTimeout(1000);
    
    // 更新後のタスクバーを再取得
    const updatedTaskBar = page.locator('[data-task-id]').first();
    const updatedBox = await updatedTaskBar.boundingBox();
    const updatedTitle = await updatedTaskBar.getAttribute('title');
    
    console.log('更新後位置:', updatedBox?.x);
    console.log('更新後タイトル:', updatedTitle);
    
    // 更新後の日付を抽出
    const updatedDateMatch = updatedTitle?.match(/\((\d{4}\/\d{2}\/\d{2}) - (\d{4}\/\d{2}\/\d{2})\)/);
    const updatedStartDate = updatedDateMatch?.[1];
    const updatedEndDate = updatedDateMatch?.[2];
    
    console.log('更新後開始日:', updatedStartDate);
    console.log('更新後終了日:', updatedEndDate);
    
    // 位置が変わったことを確認
    expect(updatedBox?.x).not.toBe(initialBox.x);
    expect(updatedBox?.x).toBeGreaterThan(initialBox.x);
    
    // 日付が変わったことを確認
    expect(updatedStartDate).not.toBe(initialStartDate);
    expect(updatedEndDate).not.toBe(initialEndDate);
    
    // 日付の差分を計算
    if (initialStartDate && updatedStartDate) {
      const initial = new Date(initialStartDate);
      const updated = new Date(updatedStartDate);
      const diffDays = Math.round((updated.getTime() - initial.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('日付の差分（日）:', diffDays);
      console.log('ピクセル移動距離:', dragDistance);
      
      // ピクセル移動距離と日付の変化の関係を確認
      // この部分で実際の問題を特定できます
    }
  });

  test('複数の距離でドラッグテスト', async ({ page }) => {
    const distances = [50, 100, 150, 200];
    const results: Array<{distance: number, daysDiff: number, pixelsPerDay: number}> = [];
    
    for (const distance of distances) {
      // ページをリロードして初期状態に戻す
      await page.reload();
      await page.waitForSelector('[data-testid="gantt-chart-area"]', { timeout: 10000 });
      
      const taskBar = page.locator('[data-task-id]').first();
      await expect(taskBar).toBeVisible();
      
      const initialBox = await taskBar.boundingBox();
      if (!initialBox) continue;
      
      const initialTitle = await taskBar.getAttribute('title');
      const dateMatch = initialTitle?.match(/\((\d{4}\/\d{2}\/\d{2}) - (\d{4}\/\d{2}\/\d{2})\)/);
      const initialStartDate = dateMatch?.[1];
      
      // ドラッグ
      await taskBar.hover();
      await page.mouse.down();
      await page.mouse.move(initialBox.x + initialBox.width / 2 + distance, initialBox.y + initialBox.height / 2);
      await page.mouse.up();
      
      await page.waitForTimeout(1000);
      
      const updatedTaskBar = page.locator('[data-task-id]').first();
      const updatedTitle = await updatedTaskBar.getAttribute('title');
      const updatedDateMatch = updatedTitle?.match(/\((\d{4}\/\d{2}\/\d{2}) - (\d{4}\/\d{2}\/\d{2})\)/);
      const updatedStartDate = updatedDateMatch?.[1];
      
      if (initialStartDate && updatedStartDate) {
        const initial = new Date(initialStartDate);
        const updated = new Date(updatedStartDate);
        const diffDays = Math.round((updated.getTime() - initial.getTime()) / (1000 * 60 * 60 * 24));
        const pixelsPerDay = distance / diffDays;
        
        results.push({ distance, daysDiff: diffDays, pixelsPerDay });
        
        console.log(`距離: ${distance}px, 日数差: ${diffDays}日, ピクセル/日: ${pixelsPerDay.toFixed(2)}`);
      }
    }
    
    // 結果を分析
    console.log('\n=== 分析結果 ===');
    console.log('ドラッグ距離と日付変化の関係:');
    results.forEach(r => {
      console.log(`${r.distance}px → ${r.daysDiff}日 (${r.pixelsPerDay.toFixed(2)}px/日)`);
    });
    
    // ピクセル/日が一定であることを確認
    if (results.length > 1) {
      const pixelsPerDayValues = results.map(r => r.pixelsPerDay);
      const avg = pixelsPerDayValues.reduce((a, b) => a + b) / pixelsPerDayValues.length;
      const variance = pixelsPerDayValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / pixelsPerDayValues.length;
      
      console.log(`\n平均ピクセル/日: ${avg.toFixed(2)}`);
      console.log(`分散: ${variance.toFixed(2)}`);
      
      // 分散が小さいことを確認（一貫性のチェック）
      expect(variance).toBeLessThan(5);
    }
  });

  test('チャート幅と日付範囲の関係を確認', async ({ page }) => {
    // チャート要素の幅を取得
    const chartElement = page.locator('[data-testid="gantt-chart-area"] > div').last();
    const chartBox = await chartElement.boundingBox();
    
    console.log('チャート幅:', chartBox?.width);
    
    // 時間軸の情報を取得（最初と最後の日付）
    const timeAxisItems = page.locator('.absolute.top-0.bottom-0.border-r');
    const count = await timeAxisItems.count();
    
    console.log('時間軸アイテム数:', count);
    
    // デバッグ情報を出力
    const chartInfo = await page.evaluate(() => {
      // グローバル変数やデータ属性から情報を取得する処理
      const chartEl = document.querySelector('[data-testid="gantt-chart-area"]');
      return {
        scrollWidth: chartEl?.scrollWidth,
        clientWidth: chartEl?.clientWidth,
        offsetWidth: chartEl?.offsetWidth
      };
    });
    
    console.log('チャート情報:', chartInfo);
  });
});