# オニオンアーキテクチャ - レイヤー詳細

## 1. Domain Model Layer（ドメインモデル層）

### 概要
最も内側のコア層で、ビジネスの本質的な概念とルールを表現します。

### 含まれるもの
- **エンティティ（Entities）**
  - ビジネス上の重要な概念を表現するオブジェクト
  - 一意の識別子（ID）を持つ
  - ライフサイクルを持つ

- **値オブジェクト（Value Objects）**
  - 不変のオブジェクト
  - 識別子を持たず、値の等価性で比較
  - ドメインの概念を明確に表現

- **ドメインイベント（Domain Events）**
  - ドメイン内で発生した重要な出来事
  - イベント駆動アーキテクチャの基盤

### 実装例
```typescript
// エンティティの例
export class Task {
  constructor(
    private readonly id: TaskId,
    private name: string,
    private status: TaskStatus,
    private assignee: Assignee,
    private period: Period
  ) {}

  // ビジネスロジック
  canStart(): boolean {
    return this.status === TaskStatus.NotStarted && 
           this.period.isStarted();
  }

  complete(): void {
    if (!this.canComplete()) {
      throw new Error('タスクを完了できません');
    }
    this.status = TaskStatus.Completed;
  }
}

// 値オブジェクトの例
export class Period {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date
  ) {
    if (startDate > endDate) {
      throw new Error('開始日は終了日より前である必要があります');
    }
  }

  isStarted(): boolean {
    return new Date() >= this.startDate;
  }
}
```

### 制約
- 外部への依存なし（フレームワーク、ライブラリ、インフラストラクチャ）
- 永続化の詳細を知らない
- 純粋なビジネスロジックのみ

## 2. Domain Services Layer（ドメインサービス層）

### 概要
複数のエンティティにまたがるビジネスロジックや、エンティティに属さないドメインロジックを扱います。

### 含まれるもの
- **ドメインサービス**
  - 状態を持たないサービス
  - 複雑なビジネスルールの実装
  - エンティティ間の調整

- **仕様パターン（Specification Pattern）**
  - ビジネスルールの再利用可能な実装
  - 複雑な条件判定のカプセル化

### 実装例
```typescript
// ドメインサービスの例
export class TaskDependencyValidator {
  validate(
    task: Task,
    dependency: Task,
    allTasks: Task[]
  ): ValidationResult {
    // 循環依存のチェック
    if (this.hasCircularDependency(task, dependency, allTasks)) {
      return ValidationResult.error('循環依存が検出されました');
    }

    // 期間の整合性チェック
    if (dependency.period.endDate > task.period.startDate) {
      return ValidationResult.error('依存タスクの終了日が開始日より後です');
    }

    return ValidationResult.success();
  }

  private hasCircularDependency(
    task: Task,
    dependency: Task,
    allTasks: Task[]
  ): boolean {
    // 循環依存の検出ロジック
  }
}
```

### 制約
- ドメインモデル層にのみ依存
- インフラストラクチャの詳細を知らない
- 状態を持たない（ステートレス）

## 3. Application Services Layer（アプリケーションサービス層）

### 概要
ユースケースを実装し、ドメイン層とインフラストラクチャ層を調整します。

### 含まれるもの
- **アプリケーションサービス**
  - ユースケースの実装
  - トランザクション境界の管理
  - ドメインオブジェクトの調整

- **リポジトリインターフェース**
  - 永続化の抽象化
  - ドメインオブジェクトの取得・保存

- **DTOs（Data Transfer Objects）**
  - レイヤー間のデータ転送
  - 外部とのインターフェース

### 実装例
```typescript
// リポジトリインターフェースの例
export interface ITaskRepository {
  findById(id: TaskId): Promise<Task | null>;
  save(task: Task): Promise<void>;
  findByProjectId(projectId: string): Promise<Task[]>;
}

// アプリケーションサービスの例
export class TaskApplicationService {
  constructor(
    private taskRepository: ITaskRepository,
    private userRepository: IUserRepository,
    private taskFactory: TaskFactory
  ) {}

  async createTask(command: CreateTaskCommand): Promise<TaskDto> {
    // ユーザーの存在確認
    const assignee = await this.userRepository.findById(command.assigneeId);
    if (!assignee) {
      throw new Error('担当者が見つかりません');
    }

    // タスクの作成
    const task = this.taskFactory.create({
      name: command.name,
      assignee: assignee,
      period: new Period(command.startDate, command.endDate)
    });

    // 永続化
    await this.taskRepository.save(task);

    return TaskDto.fromDomain(task);
  }

  async completeTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.findById(new TaskId(taskId));
    if (!task) {
      throw new Error('タスクが見つかりません');
    }

    // ドメインロジックの実行
    task.complete();

    // 変更の永続化
    await this.taskRepository.save(task);
  }
}
```

### 制約
- ドメイン層に依存
- インフラストラクチャ層の実装ではなくインターフェースに依存
- ビジネスロジックを含まない（ドメイン層に委譲）

## 4. Infrastructure Layer（インフラストラクチャ層）

### 概要
技術的な詳細の実装を担当し、アプリケーションの外部境界を形成します。

### 含まれるもの
- **リポジトリ実装**
  - データベースアクセスの実装
  - ORMの使用
  - クエリの最適化

- **外部サービス連携**
  - API通信
  - メッセージング
  - ファイルシステムアクセス

- **UI/プレゼンテーション**
  - Webフレームワーク（Next.js等）
  - REST API
  - GraphQL

- **設定・DI**
  - 依存性注入コンテナ
  - 環境設定
  - ロギング

### 実装例
```typescript
// リポジトリ実装の例
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: TaskId): Promise<Task | null> {
    const data = await this.prisma.task.findUnique({
      where: { id: id.value },
      include: {
        assignee: true,
        dependencies: true
      }
    });

    if (!data) return null;

    // ドメインオブジェクトへの変換
    return this.toDomain(data);
  }

  async save(task: Task): Promise<void> {
    const data = this.toPersistence(task);
    
    await this.prisma.task.upsert({
      where: { id: data.id },
      create: data,
      update: data
    });
  }

  private toDomain(data: any): Task {
    // Prismaのデータからドメインオブジェクトへの変換
  }

  private toPersistence(task: Task): any {
    // ドメインオブジェクトからPrismaのデータへの変換
  }
}

// API実装の例（Next.js）
export async function POST(request: Request) {
  const body = await request.json();
  
  const command = new CreateTaskCommand(
    body.name,
    body.assigneeId,
    new Date(body.startDate),
    new Date(body.endDate)
  );

  try {
    const result = await taskApplicationService.createTask(command);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

### 制約
- 内側のすべてのレイヤーに依存可能
- 技術的詳細の変更が内側のレイヤーに影響しない
- インターフェースの実装を提供

## レイヤー間の通信パターン

### 1. 依存性注入（DI）
```typescript
// DIコンテナの設定例
container.bind<ITaskRepository>(TYPES.TaskRepository)
  .to(PrismaTaskRepository);
container.bind<TaskApplicationService>(TYPES.TaskApplicationService)
  .to(TaskApplicationService);
```

### 2. データ変換
```typescript
// DTOとドメインオブジェクトの変換
export class TaskDto {
  static fromDomain(task: Task): TaskDto {
    return {
      id: task.id.value,
      name: task.name,
      status: task.status,
      assigneeName: task.assignee.name,
      startDate: task.period.startDate,
      endDate: task.period.endDate
    };
  }
}
```

### 3. エラーハンドリング
```typescript
// レイヤー境界でのエラー変換
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
  }
}

// ドメイン例外をアプリケーション例外に変換
try {
  task.complete();
} catch (error) {
  if (error instanceof DomainError) {
    throw new ApplicationError(
      error.message,
      'TASK_CANNOT_COMPLETE',
      400
    );
  }
  throw error;
}
```

## まとめ

各レイヤーは明確な責務を持ち、依存関係の方向を内側に保つことで、変更に強く、テストしやすいアーキテクチャを実現します。重要なのは、各レイヤーの境界を明確に保ち、適切な抽象化を行うことです。