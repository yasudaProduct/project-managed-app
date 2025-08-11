# ガントチャートV3 実装計画書

## 概要

本ドキュメントは、ガントチャートV3の段階的実装計画を定義します。TDD（Test-Driven Development）アプローチに基づき、4つのフェーズに分けて8-12週間での実装完了を目標とします。

## 実装戦略

### アプローチ
- **Test-Driven Development**: テスト → 実装 → リファクタリングのサイクル
- **段階的実装**: 基盤 → コア機能 → 高度機能 → 最適化の順序
- **継続的統合**: 各マイルストーンでの動作確認と品質保証
- **リスク軽減**: 既存機能への影響を最小化する並行開発

### 技術スタック
- **フロントエンド**: Next.js 15, TypeScript, React, Tailwind CSS
- **バックエンド**: Prisma ORM, PostgreSQL, Server Actions
- **テスト**: Jest, React Testing Library, Playwright（E2E）
- **状態管理**: Zustand または Redux Toolkit
- **ビルドツール**: Turbopack, ESLint, Prettier

## フェーズ1: 基盤整備（2-3週間）

### マイルストーン1.1: データベーススキーマ拡張
**期間**: 3-4日  
**担当**: バックエンド

#### テスト作成（TDD Step 1）
```typescript
// __tests__/infrastructure/task-dependency.repository.test.ts
describe('TaskDependencyRepository', () => {
  it('should create dependency with FS type', async () => {
    const dependency = await repository.create({
      predecessorId: 1,
      successorId: 2,
      type: 'FINISH_TO_START'
    });
    expect(dependency.type).toBe('FINISH_TO_START');
  });

  it('should prevent circular dependencies', async () => {
    await expect(
      repository.create({
        predecessorId: 2,
        successorId: 1 // 既に1→2が存在する場合
      })
    ).rejects.toThrow('Circular dependency detected');
  });
});
```

#### 実装タスク
1. **データベースマイグレーション**
   ```sql
   -- Create TaskDependency table
   CREATE TABLE TaskDependency (
     id SERIAL PRIMARY KEY,
     predecessorId INTEGER NOT NULL REFERENCES WbsTask(id),
     successorId INTEGER NOT NULL REFERENCES WbsTask(id),
     dependencyType DependencyType NOT NULL DEFAULT 'FINISH_TO_START',
     lagDays INTEGER NOT NULL DEFAULT 0,
     createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
     updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
     
     UNIQUE(predecessorId, successorId),
     CHECK(predecessorId != successorId)
   );
   ```

2. **Prismaスキーマ更新**
3. **循環依存検証関数実装**
4. **データ移行スクリプト作成**

#### 受け入れ基準
- [ ] 依存関係テーブルが正常に作成される
- [ ] 循環依存の制約チェックが動作する
- [ ] 既存データとの整合性が保たれる
- [ ] マイグレーションがロールバック可能

### マイルストーン1.2: ドメインモデル拡張
**期間**: 4-5日  
**担当**: ドメイン層

#### テスト作成（TDD Step 1）
```typescript
// __tests__/domains/task-dependency.test.ts
describe('TaskDependency Domain', () => {
  it('should create valid FS dependency', () => {
    const dependency = TaskDependency.create({
      predecessor: mockTask1,
      successor: mockTask2,
      type: 'FINISH_TO_START'
    });
    
    expect(dependency.canCreateDependency()).toBe(true);
    expect(dependency.getConstraintDate()).toEqual(mockTask1.endDate);
  });

  it('should validate dependency constraints', () => {
    const dependency = TaskDependency.create({
      predecessor: mockTask1,
      successor: mockTask2,
      type: 'START_TO_START'
    });
    
    const violation = dependency.validateConstraint();
    expect(violation).toBeNull(); // 制約違反なし
  });
});
```

#### 実装タスク
1. **TaskDependencyドメインクラス**
2. **依存関係検証ロジック**
3. **CriticalPathServiceの基本実装**
4. **ResourceManagerServiceの拡張**

#### 受け入れ基準
- [ ] 依存関係の作成・検証が正しく動作
- [ ] ドメインロジックの単体テストが全てパス
- [ ] 循環依存検証が100%動作
- [ ] 依存関係タイプ別の制約計算が正確

### マイルストーン1.3: Server Actions基盤構築
**期間**: 5-6日  
**担当**: Server Actions層

#### テスト作成（TDD Step 1）
```typescript
// __tests__/actions/task-dependencies.test.ts
describe('createTaskDependency Server Action', () => {
  it('should create new dependency successfully', async () => {
    const result = await createTaskDependency({
      wbsId: 1,
      predecessorId: 1,
      successorId: 2,
      type: 'FINISH_TO_START'
    });
      
    expect(result.success).toBe(true);
    expect(result.data.dependency).toMatchObject({
      predecessorId: 1,
      successorId: 2,
      type: 'FINISH_TO_START'
    });
  });

  it('should return error for circular dependency', async () => {
    const result = await createTaskDependency({
      wbsId: 1,
      predecessorId: 2,
      successorId: 1 // 循環依存
    });
      
    expect(result.success).toBe(false);
    expect(result.error).toContain('circular');
  });
});
```

#### 実装タスク
1. **依存関係管理Actions** (`src/app/actions/task-dependencies.ts`)
2. **クリティカルパス計算Actions** (`src/app/actions/critical-path.ts`)
3. **自動スケジューリングActions** (`src/app/actions/auto-scheduling.ts`)
4. **共通バリデーション・認証・エラーハンドリング**

#### 受け入れ基準
- [ ] 全Server Actionsが仕様通り動作
- [ ] 型安全性が確保されている
- [ ] エラーハンドリングが適切
- [ ] レスポンス時間が2秒以内
- [ ] Server Actions統合テストが全てパス

## フェーズ2: コアコンポーネント実装（3-4週間）

### マイルストーン2.1: 基本ガントチャートコンポーネント
**期間**: 1週間  
**担当**: フロントエンド

#### テスト作成（TDD Step 1）
```typescript
// __tests__/components/gantt-v3.test.tsx
describe('GanttV3 Component', () => {
  it('should render tasks correctly', () => {
    render(<GanttV3 wbsId={1} tasks={mockTasks} />);
    
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('should handle task drag and drop', async () => {
    const onTaskMove = jest.fn();
    render(<GanttV3 wbsId={1} onTaskMove={onTaskMove} />);
    
    const taskBar = screen.getByTestId('task-bar-1');
    
    // ドラッグ&ドロップシミュレーション
    fireEvent.dragStart(taskBar);
    fireEvent.dragEnd(taskBar);
    
    expect(onTaskMove).toHaveBeenCalledWith(1, expect.any(Date));
  });
});
```

#### 実装タスク
1. **GanttV3メインコンテナ**
2. **GanttChart基本表示**
3. **GanttTaskBar拡張（期間タイプ別表示）**
4. **GanttTimeline改良**

#### 受け入れ基準
- [ ] 既存GanttV2の全機能が移植完了
- [ ] 期間タイプ別表示（基準・予定・実績）が実装
- [ ] ドラッグ&ドロップが滑らかに動作
- [ ] レスポンシブデザインが適切

### マイルストーン2.2: 依存関係表示システム
**期間**: 1.5週間  
**担当**: フロントエンド

#### テスト作成（TDD Step 1）
```typescript
// __tests__/components/gantt-dependency.test.tsx
describe('GanttDependency Component', () => {
  it('should render FS dependency arrow correctly', () => {
    render(
      <GanttDependency
        dependency={mockFSDependency}
        fromTask={mockTask1}
        toTask={mockTask2}
      />
    );
    
    const arrow = screen.getByTestId('dependency-arrow');
    expect(arrow).toHaveAttribute('d', expect.stringContaining('M'));
  });

  it('should create dependency on drag and drop', async () => {
    const onCreate = jest.fn();
    render(<GanttDependencyCreator onCreate={onCreate} />);
    
    // タスク1の終端からタスク2の開始点へドラッグ
    const fromHandle = screen.getByTestId('task-end-handle-1');
    const toHandle = screen.getByTestId('task-start-handle-2');
    
    fireEvent.dragStart(fromHandle);
    fireEvent.dragOver(toHandle);
    fireEvent.drop(toHandle);
    
    expect(onCreate).toHaveBeenCalledWith({
      predecessorId: 1,
      successorId: 2,
      type: 'FINISH_TO_START'
    });
  });
});
```

#### 実装タスク
1. **GanttDependencyコンポーネント（SVG矢印描画）**
2. **GanttDependencyCreator（ドラッグ&ドロップ作成）**
3. **GanttDependencyDialog（編集ダイアログ）**
4. **依存関係パス計算ユーティリティ**

#### 受け入れ基準
- [ ] 4種類の依存関係が正しく表示される
- [ ] 矢印の描画が適切（パス計算正確）
- [ ] ドラッグ&ドロップでの作成が直感的
- [ ] 編集・削除操作が滑らか

### マイルストーン2.3: クリティカルパス機能
**期間**: 1週間  
**担当**: フロントエンド + アルゴリズム

#### テスト作成（TDD Step 1）
```typescript
// __tests__/utils/critical-path-algorithm.test.ts
describe('Critical Path Algorithm', () => {
  it('should calculate correct critical path', () => {
    const result = calculateCriticalPathCPM(mockTasks, mockDependencies);
    
    expect(result.criticalPath).toEqual([1, 3, 5]); // 期待するクリティカルパス
    expect(result.totalDuration).toBe(15); // 総期間
  });

  it('should calculate float times correctly', () => {
    const result = calculateCriticalPathCPM(mockTasks, mockDependencies);
    
    expect(result.taskSchedule.get(2).totalFloat).toBe(3);
    expect(result.taskSchedule.get(4).freeFloat).toBe(1);
  });
});
```

#### 実装タスク
1. **CPM計算アルゴリズム実装**
2. **GanttCriticalPathコンポーネント**
3. **useCriticalPathフック**
4. **フロート時間表示機能**

#### 受け入れ基準
- [ ] CPM計算が数学的に正確
- [ ] クリティカルパスのハイライトが見やすい
- [ ] フロート時間が正確に表示
- [ ] パス変更時の動的更新が高速

### マイルストーン2.4: 自動スケジューリング
**期間**: 0.5週間  
**担当**: フロントエンド + バックエンド

#### テスト作成（TDD Step 1）
```typescript
// __tests__/services/auto-scheduler.test.ts
describe('Auto Scheduler', () => {
  it('should reschedule dependent tasks when predecessor moves', async () => {
    const result = await autoSchedule({
      wbsId: 1,
      triggerTaskId: 1,
      newStartDate: '2025-01-15',
      preserveUserChanges: false
    });
    
    expect(result.updatedTasks).toContainEqual({
      id: 2,
      newStartDate: '2025-01-20', // 依存関係により自動調整
      changeReason: 'Dependency constraint'
    });
  });

  it('should detect resource conflicts', async () => {
    const result = await autoSchedule({ wbsId: 1, checkResources: true });
    
    expect(result.conflicts).toContainEqual({
      taskId: 3,
      conflictType: 'RESOURCE',
      description: expect.stringContaining('overallocated')
    });
  });
});
```

#### 実装タスク
1. **制約ベーススケジューリング**
2. **依存関係による自動調整**
3. **競合検知とアラート**
4. **手動変更保護オプション**

#### 受け入れ基準
- [ ] 依存関係制約が正しく適用される
- [ ] リソース制約が考慮される
- [ ] ユーザー手動変更の保護が動作
- [ ] スケジューリング結果が論理的に正しい

## フェーズ3: 高度機能実装（2-3週間）

### マイルストーン3.1: リソース管理機能
**期間**: 1.5週間  
**担当**: フロントエンド + バックエンド

#### テスト作成（TDD Step 1）
```typescript
// __tests__/components/gantt-resource-view.test.tsx
describe('GanttResourceView', () => {
  it('should display resource utilization correctly', () => {
    render(<GanttResourceView assignees={mockAssignees} />);
    
    // 稼働率100%のユーザー
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // オーバーブッキング警告
    expect(screen.getByText(/overallocated/i)).toBeInTheDocument();
  });

  it('should show resource conflicts', () => {
    render(<GanttResourceView conflicts={mockConflicts} />);
    
    const conflictAlert = screen.getByRole('alert');
    expect(conflictAlert).toHaveTextContent('Resource conflict detected');
  });
});
```

#### 実装タスク
1. **GanttResourceViewコンポーネント**
2. **リソース利用率計算**
3. **オーバーブッキング警告**
4. **リソース平準化機能**

#### 受け入れ基準
- [ ] 担当者別負荷状況が視覚的に分かりやすい
- [ ] リソース競合が即座に検知される
- [ ] 平準化提案が実用的
- [ ] パフォーマンスが1000タスクでも良好

### マイルストーン3.2: 高度な表示機能
**期間**: 1週間  
**担当**: フロントエンド

#### テスト作成（TDD Step 1）
```typescript
// __tests__/components/gantt-progress-bar.test.tsx
describe('GanttProgressBar', () => {
  it('should show progress correctly', () => {
    render(<GanttProgressBar task={mockTaskWith50Progress} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveStyle('width: 50%');
  });
});
```

#### 実装タスク
1. **進捗バー表示**
2. **カスタム色分けテーマ**
3. **印刷対応レイアウト**
4. **エクスポート機能（PDF/画像）**

#### 受け入れ基準
- [ ] 進捗が直感的に理解できる
- [ ] 印刷レイアウトが実用的
- [ ] エクスポート機能が高品質
- [ ] カスタマイズが柔軟

## フェーズ4: 統合・最適化（1-2週間）

### マイルストーン4.1: パフォーマンス最適化
**期間**: 0.5週間  
**担当**: フロントエンド

#### パフォーマンステスト
```typescript
// __tests__/performance/gantt-performance.test.ts
describe('Gantt Performance', () => {
  it('should render 1000 tasks within 1 second', async () => {
    const startTime = performance.now();
    
    render(<GanttV3 tasks={generate1000Tasks()} />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('gridcell')).toHaveLength(1000);
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should maintain 60fps during scrolling', async () => {
    const { container } = render(<GanttV3 tasks={generate1000Tasks()} />);
    const scrollContainer = container.querySelector('.gantt-scroll');
    
    const frameRates = [];
    let lastTime = performance.now();
    
    const scrollHandler = () => {
      const currentTime = performance.now();
      frameRates.push(1000 / (currentTime - lastTime));
      lastTime = currentTime;
    };
    
    scrollContainer.addEventListener('scroll', scrollHandler);
    
    // スクロールシミュレーション
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 5000 } });
    
    const avgFrameRate = frameRates.reduce((a, b) => a + b) / frameRates.length;
    expect(avgFrameRate).toBeGreaterThan(55); // 55fps以上
  });
});
```

#### 最適化タスク
1. **仮想化スクロール実装**
2. **レンダリング最適化（React.memo, useMemo）**
3. **バンドルサイズ最適化**
4. **メモリ使用量削減**

### マイルストーン4.2: テスト・品質保証
**期間**: 1週間  
**担当**: QA + フロントエンド

#### テストカバレッジ目標
- **ユニットテスト**: 85%以上
- **統合テスト**: 主要フロー100%
- **E2Eテスト**: クリティカルパス100%

#### E2Eテスト例
```typescript
// __tests__/e2e/gantt-workflow.spec.ts
test('complete gantt workflow', async ({ page }) => {
  await page.goto('/wbs/1/ganttv3');
  
  // 1. タスク移動
  await page.dragAndDrop(
    '[data-testid="task-bar-1"]',
    '[data-testid="timeline-date-2025-01-15"]'
  );
  
  // 2. 依存関係作成
  await page.dragAndDrop(
    '[data-testid="task-end-handle-1"]',
    '[data-testid="task-start-handle-2"]'
  );
  
  // 3. クリティカルパス表示
  await page.click('[data-testid="show-critical-path"]');
  
  // 4. 検証
  await expect(page.locator('.critical-task')).toBeVisible();
  await expect(page.locator('.dependency-arrow')).toBeVisible();
});
```

### マイルストーン4.3: ドキュメンテーション
**期間**: 0.5週間  
**担当**: 全員

#### ドキュメント成果物
1. **Server Actions仕様書**: TypeScript型定義付き仕様書
2. **コンポーネントガイド**: Storybook
3. **ユーザーマニュアル**: 操作ガイド
4. **開発者向けドキュメント**: アーキテクチャ解説

## リスク管理・マイルストーン

### 技術リスク

#### CPM計算の複雑性
**リスク**: 大規模プロジェクトでの計算パフォーマンス  
**対策**: Web Worker活用、段階的計算、キャッシュ戦略

#### 依存関係矢印の描画
**リスク**: 複雑なレイアウトでの矢印描画  
**対策**: SVGライブラリ活用、パス計算の最適化

#### パフォーマンス劣化
**リスク**: 大量データでの応答性低下  
**対策**: 仮想化、遅延ローディング、プロファイリング

### スケジュールリスク

#### 依存関係機能の工数増大
**対策**: 機能分割、MVP定義の明確化

#### 既存機能との統合
**対策**: 段階的移行、テスト自動化

### 品質リスク

#### ユーザビリティ低下
**対策**: ユーザーテスト、段階的ロールアウト

#### データ整合性
**対策**: トランザクション管理、バックアップ戦略

## デプロイメント戦略

### 段階的リリース

#### Phase 1: ベータ版（社内限定）
- **対象**: 開発チーム、QAチーム
- **機能**: 基本依存関係、クリティカルパス
- **期間**: 2週間

#### Phase 2: 限定公開
- **対象**: パワーユーザー（10名）
- **機能**: 全機能（リソース管理除く）
- **期間**: 2週間

#### Phase 3: 段階的ロールアウト
- **対象**: 全ユーザーの30% → 70% → 100%
- **機能**: 全機能
- **期間**: 3週間

### フィーチャーフラグ戦略
```typescript
interface FeatureFlags {
  GANTT_V3_ENABLED: boolean;
  DEPENDENCIES_ENABLED: boolean;
  CRITICAL_PATH_ENABLED: boolean;
  AUTO_SCHEDULER_ENABLED: boolean;
  RESOURCE_VIEW_ENABLED: boolean;
}
```

## 成功指標・KPI

### 機能指標
- [ ] 依存関係作成成功率: 90%以上
- [ ] クリティカルパス計算精度: 100%
- [ ] 自動スケジューリング応答時間: 2秒以内
- [ ] バグ報告数: 週5件未満

### パフォーマンス指標
- [ ] 1000タスク初期表示: 1秒以内
- [ ] スクロール応答性: 60FPS維持
- [ ] メモリ使用量: 100MB未満
- [ ] バンドルサイズ増加: 20%未満

### ビジネス指標
- [ ] ユーザー移行率: 90%以上
- [ ] ユーザー満足度: 4.5/5.0以上
- [ ] サポート問い合わせ: 20%削減
- [ ] タスク管理効率: 30%向上

## 体制・コミュニケーション

### 開発体制
- **フロントエンド**: 2名
- **バックエンド**: 1名  
- **QA**: 1名
- **プロダクトマネージャー**: 1名

### コミュニケーション計画
- **デイリースタンドアップ**: 毎日15分
- **スプリントレビュー**: 2週間毎
- **技術レビュー**: 週1回
- **ステークホルダー報告**: 月1回

---

**文書作成日**: 2025-08-08  
**作成者**: Claude Code  
**文書バージョン**: 1.0  
**関連文書**: gantt-v3-requirements.md, gantt-v3-design.md