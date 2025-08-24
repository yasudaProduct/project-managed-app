# オニオンアーキテクチャ - 制約とガイドライン

## アーキテクチャ制約

### 1. 依存関係の制約

#### 基本ルール
- **依存は必ず内側に向かう**: 外側のレイヤーは内側のレイヤーに依存できるが、その逆は禁止
- **レイヤーをスキップしない**: 隣接するレイヤーとのみやり取りすることが推奨される
- **循環依存の禁止**: レイヤー間、クラス間での循環依存は避ける

#### 依存関係マトリックス
| From \ To | Domain Model | Domain Services | Application Services | Infrastructure |
|-----------|--------------|-----------------|---------------------|----------------|
| Domain Model | ✓ | ✗ | ✗ | ✗ |
| Domain Services | ✓ | ✓ | ✗ | ✗ |
| Application Services | ✓ | ✓ | ✓ | ✗ (インターフェースのみ) |
| Infrastructure | ✓ | ✓ | ✓ | ✓ |

### 2. 各レイヤーの制約

#### Domain Model層の制約
```typescript
// ❌ 悪い例：外部ライブラリへの依存
import { v4 as uuidv4 } from 'uuid'; // 外部ライブラリ
import { PrismaClient } from '@prisma/client'; // インフラストラクチャ

export class Task {
  constructor() {
    this.id = uuidv4(); // ❌ 外部ライブラリの使用
  }
  
  async save(prisma: PrismaClient) { // ❌ 永続化の詳細を知っている
    await prisma.task.create({ data: this });
  }
}

// ✅ 良い例：純粋なドメインロジック
export class Task {
  constructor(
    private readonly id: TaskId, // 値オブジェクトを使用
    private name: string,
    private status: TaskStatus
  ) {}
  
  complete(): void {
    if (this.status !== TaskStatus.InProgress) {
      throw new DomainException('進行中のタスクのみ完了できます');
    }
    this.status = TaskStatus.Completed;
  }
}
```

#### Application Services層の制約
```typescript
// ❌ 悪い例：ビジネスロジックの実装
export class TaskApplicationService {
  async completeTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.findById(taskId);
    
    // ❌ ビジネスロジックを直接実装
    if (task.status !== 'IN_PROGRESS') {
      throw new Error('進行中のタスクのみ完了できます');
    }
    task.status = 'COMPLETED';
    
    await this.taskRepository.save(task);
  }
}

// ✅ 良い例：ドメインロジックへの委譲
export class TaskApplicationService {
  async completeTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.findById(new TaskId(taskId));
    
    // ✅ ドメインオブジェクトのメソッドを呼び出す
    task.complete();
    
    await this.taskRepository.save(task);
  }
}
```

### 3. インターフェース分離の原則

#### リポジトリインターフェースの配置
```typescript
// ✅ Application Services層にインターフェースを定義
// src/applications/task/itask-repository.ts
export interface ITaskRepository {
  findById(id: TaskId): Promise<Task | null>;
  save(task: Task): Promise<void>;
}

// ✅ Infrastructure層で実装
// src/infrastructures/task-repository.ts
export class PrismaTaskRepository implements ITaskRepository {
  // 実装詳細
}
```

## 実装ガイドライン

### 1. ドメインモデリング

#### エンティティ設計のガイドライン
- **一意性**: 必ず一意の識別子を持つ
- **不変条件**: コンストラクタやメソッドで不変条件を保証
- **ビジネスロジック**: 状態変更は必ずメソッド経由で行う

```typescript
export class Project {
  private constructor(
    private readonly id: ProjectId,
    private name: string,
    private status: ProjectStatus,
    private startDate: Date,
    private endDate: Date
  ) {
    // 不変条件のチェック
    this.validateDates(startDate, endDate);
  }

  // ファクトリメソッドで生成を制御
  static create(params: CreateProjectParams): Project {
    return new Project(
      ProjectId.generate(),
      params.name,
      ProjectStatus.Planning,
      params.startDate,
      params.endDate
    );
  }

  // ビジネスロジックをメソッドとして実装
  start(): void {
    if (this.status !== ProjectStatus.Planning) {
      throw new DomainException('計画中のプロジェクトのみ開始できます');
    }
    if (new Date() < this.startDate) {
      throw new DomainException('開始日前にプロジェクトを開始できません');
    }
    this.status = ProjectStatus.Active;
  }
}
```

#### 値オブジェクト設計のガイドライン
- **不変性**: 一度作成したら変更不可
- **等価性**: 値による比較を実装
- **自己完結**: それ自体で完結した概念を表現

```typescript
export class Period {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {
    if (startDate > endDate) {
      throw new Error('開始日は終了日より前である必要があります');
    }
  }

  equals(other: Period): boolean {
    return this.startDate.getTime() === other.startDate.getTime() &&
           this.endDate.getTime() === other.endDate.getTime();
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(other: Period): boolean {
    return this.startDate <= other.endDate && 
           this.endDate >= other.startDate;
  }
}
```

### 2. エラーハンドリング

#### レイヤー別エラー処理
```typescript
// Domain層：ドメイン固有の例外
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

export class TaskNotFoundException extends DomainException {
  constructor(taskId: TaskId) {
    super(`タスクが見つかりません: ${taskId.value}`);
  }
}

// Application層：アプリケーション例外
export class ApplicationException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
  }
}

// Infrastructure層：技術的例外の変換
export class PrismaTaskRepository implements ITaskRepository {
  async findById(id: TaskId): Promise<Task | null> {
    try {
      const data = await this.prisma.task.findUnique({
        where: { id: id.value }
      });
      return data ? this.toDomain(data) : null;
    } catch (error) {
      // Prismaの例外をドメイン例外に変換
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InfrastructureException('データベースエラー', error);
      }
      throw error;
    }
  }
}
```

### 3. テスト戦略

#### レイヤー別テスト方針
```typescript
// Domain層：ユニットテスト
describe('Task', () => {
  it('進行中のタスクを完了できる', () => {
    const task = new Task(
      new TaskId('1'),
      'タスク名',
      TaskStatus.InProgress
    );
    
    task.complete();
    
    expect(task.status).toBe(TaskStatus.Completed);
  });
});

// Application層：モックを使用したユニットテスト
describe('TaskApplicationService', () => {
  it('タスクを作成できる', async () => {
    const mockRepo = {
      save: jest.fn(),
      findById: jest.fn()
    };
    
    const service = new TaskApplicationService(mockRepo);
    const command = new CreateTaskCommand(/*...*/);
    
    await service.createTask(command);
    
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.any(Task)
    );
  });
});

// Infrastructure層：統合テスト
describe('PrismaTaskRepository', () => {
  it('タスクを永続化できる', async () => {
    const repo = new PrismaTaskRepository(prisma);
    const task = Task.create(/*...*/);
    
    await repo.save(task);
    const found = await repo.findById(task.id);
    
    expect(found).toEqual(task);
  });
});
```

### 4. 命名規則

#### レイヤー別命名規則
| レイヤー | クラス/インターフェース | ファイル名 | 例 |
|---------|------------------------|-----------|-----|
| Domain Model | パスカルケース | ケバブケース | `Task` → `task.ts` |
| Domain Services | パスカルケース + Service | ケバブケース | `TaskDependencyValidator` → `task-dependency-validator.ts` |
| Application Services | パスカルケース + ApplicationService | ケバブケース | `TaskApplicationService` → `task-application-service.ts` |
| Repository Interface | I + パスカルケース + Repository | ケバブケース | `ITaskRepository` → `itask-repository.ts` |
| Infrastructure | パスカルケース + 技術名 + Repository | ケバブケース | `PrismaTaskRepository` → `task-repository.ts` |

### 5. ディレクトリ構造

```
src/
├── domains/                    # Domain Model & Services
│   ├── task/
│   │   ├── task.ts            # エンティティ
│   │   ├── task-id.ts         # 値オブジェクト
│   │   ├── task-status.ts     # 値オブジェクト
│   │   └── task-dependency-validator.ts  # ドメインサービス
│   └── project/
│       └── ...
├── applications/              # Application Services
│   ├── task/
│   │   ├── task-application-service.ts
│   │   ├── itask-repository.ts    # リポジトリインターフェース
│   │   └── dtos/
│   │       └── task-dto.ts
│   └── project/
│       └── ...
├── infrastructures/           # Infrastructure
│   ├── task-repository.ts     # リポジトリ実装
│   ├── project-repository.ts
│   └── ...
└── app/                      # UI層（Next.js）
    └── ...
```

## アンチパターン

### 1. 貧血ドメインモデル
```typescript
// ❌ 悪い例：ロジックのないデータ構造
export class Task {
  id: string;
  name: string;
  status: string;
  assigneeId: string;
}

// ✅ 良い例：振る舞いを持つドメインモデル
export class Task {
  // ... プロパティ

  canAssignTo(user: User): boolean {
    return user.hasCapacity() && 
           user.hasSkillFor(this.requiredSkill);
  }

  assignTo(user: User): void {
    if (!this.canAssignTo(user)) {
      throw new DomainException('このユーザーに割り当てできません');
    }
    this.assignee = user;
  }
}
```

### 2. レイヤー境界の違反
```typescript
// ❌ 悪い例：UIからリポジトリを直接呼び出し
export default function TaskPage() {
  const handleComplete = async (taskId: string) => {
    const repo = new PrismaTaskRepository();
    const task = await repo.findById(taskId);
    task.status = 'COMPLETED';
    await repo.save(task);
  };
}

// ✅ 良い例：アプリケーションサービス経由
export default function TaskPage() {
  const handleComplete = async (taskId: string) => {
    await taskApplicationService.completeTask(taskId);
  };
}
```

### 3. 過度な抽象化
```typescript
// ❌ 悪い例：不要なインターフェース
interface ITaskName {
  getValue(): string;
}

class TaskName implements ITaskName {
  constructor(private value: string) {}
  getValue(): string { return this.value; }
}

// ✅ 良い例：シンプルな値オブジェクト
export class TaskName {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('タスク名は必須です');
    }
  }
}
```

## チェックリスト

### 新機能実装時のチェックリスト
- [ ] ドメインモデルから設計を開始したか
- [ ] ビジネスロジックはドメイン層に実装されているか
- [ ] 依存関係は内側に向かっているか
- [ ] リポジトリインターフェースはApplication層に定義されているか
- [ ] DTOでレイヤー間のデータ変換を行っているか
- [ ] 適切なエラーハンドリングが実装されているか
- [ ] 各レイヤーでテストが書かれているか
- [ ] 命名規則に従っているか

### コードレビュー時のチェックポイント
- [ ] レイヤーの責務が守られているか
- [ ] 不要な依存関係がないか
- [ ] ドメインロジックがApplication層に漏れていないか
- [ ] インフラストラクチャの詳細がドメイン層に漏れていないか
- [ ] 適切な抽象化レベルか（過度でも不足でもない）

## まとめ

オニオンアーキテクチャの制約とガイドラインを守ることで、保守性が高く、変更に強いアプリケーションを構築できます。重要なのは、各レイヤーの責務を明確に保ち、依存関係の方向を常に意識することです。また、プロジェクトの規模や要件に応じて、適切な抽象化レベルを選択することも重要です。