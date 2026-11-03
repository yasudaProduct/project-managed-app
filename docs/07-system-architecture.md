# システム関連図

## 1. システム全体構成図

```mermaid
graph TB
    subgraph "クライアント層"
        Browser[Webブラウザ]
    end

    subgraph "プレゼンテーション層 (Next.js)"
        AppRouter[App Router]
        Pages[Pages/Components]
        API[API Routes/Server Action]
    end

    subgraph "アプリケーション層"
        AS[Application Services]
        QH[Query Handlers]
        EH[Event Handlers]
        DS[Domain Services]
    end

    subgraph "ドメイン層"
        DE[Domain Entities]
        VO[Value Objects]
        DR[Domain Rules]
    end

    subgraph "インフラストラクチャ層"
        Repos[Repositories]
        Prisma[Prisma ORM]
        ExtAPI[External APIs]
    end

    subgraph "データストア"
        PostgreSQL[(PostgreSQL)]
        MySQL[(MySQL 参照用)]
        FileStorage[File Storage]
    end

    subgraph "外部システム"
        Geppo[月報システム]
        Excel[Excel連携]
        Push[Web Push]
    end

    Browser --> AppRouter
    AppRouter --> Pages
    Pages --> API
    API --> AS
    AS --> QH
    AS --> EH
    AS --> DS
    DS --> DE
    DE --> VO
    DE --> DR
    AS --> Repos
    Repos --> Prisma
    Prisma --> PostgreSQL
    Prisma --> MySQL
    AS --> ExtAPI
    ExtAPI --> Geppo
    ExtAPI --> Excel
    ExtAPI --> Push
    AS --> FileStorage
```

## 2. レイヤー アーキテクチャ（オニオンアーキテクチャ）

```mermaid
graph TD
    subgraph "UI Layer"
        UI1[React Components]
        UI2[Next.js Pages]
        UI3[API Routes]
    end

    subgraph "Application Layer"
        APP1[Application Services]
        APP2[DTOs]
        APP3[Use Cases]
        APP4[Query/Command Handlers]
    end

    subgraph "Domain Layer"
        DOM1[Entities]
        DOM2[Value Objects]
        DOM3[Domain Services]
        DOM4[Domain Events]
        DOM5[Specifications]
    end

    subgraph "Infrastructure Layer"
        INF1[Prisma Repositories]
        INF2[External Service Adapters]
        INF3[File System]
        INF4[Cache]
    end

    UI1 --> APP1
    UI2 --> APP1
    UI3 --> APP1
    APP1 --> DOM1
    APP1 --> DOM3
    APP3 --> DOM1
    APP4 --> APP1
    DOM3 --> DOM1
    DOM1 --> DOM2
    DOM1 --> DOM5
    APP1 --> INF1
    APP1 --> INF2
    INF1 --> |implements| APP2
```

### インターフェイス（Ports）の配置と依存関係

本プロジェクトではオニオンアーキテクチャに従い、「機能を横断できる抽象（インターフェイス/ポート）は内側のレイヤーに置き、具体は外側で実装」する方針です。配置場所と依存関係のルールを明記します。

- 配置ポリシー（原則）
  - アプリケーション層（UseCase/サービスの入口）
    - ユースケースやアプリケーションサービスのインターフェイスを定義
    - 例: `src/applications/*/*-application-service.ts` 内の `I*ApplicationService`
    - 例: クエリ/コマンドハンドラのインターフェイス、バス等のポート
  - ドメイン層（ビジネスルールの中心）
    - リポジトリ、ファクトリ、ドメインサービスなど、ビジネスロジックが必要とするポートを定義
    - 例: `src/domains/*/itask-repository.ts` の `ITaskRepository`
  - インフラ層（外部技術詳細）
    - インターフェイスは持たず、内側で定義されたポートを実装する具体クラスのみを配置
    - 例: `src/infrastructures/*-repository.ts`, `src/infrastructures/**/**.repository.ts`

- 依存関係ルール
  - 依存の向きは常に内向き（UI → Application → Domain）。Infrastructure は Application/Domain のインターフェイスにのみ依存し、逆方向の依存は不可。
  - Application は Domain のエンティティ/値オブジェクト/ドメインサービスおよびドメインのポート（例: Repository インターフェイス）に依存してよい。
  - Domain は UI や Infrastructure に依存しない（フレームワーク非依存）。
  - 依存性注入（DI）は `src/lib/inversify.config.ts` で行い、トークンは `src/types/symbol.ts` に集約。Infrastructure の実装を内側のポート（インターフェイス）にバインドする。

補足（現状と整合性）:

- 現在の実装では、一部のリポジトリインターフェイスが `src/applications/**` 配下に置かれています（例: `src/applications/projects/iproject-repository.ts` の `IProjectRepository`）。これは許容範囲ですが、原則としてはドメインに属するリポジトリポートは `src/domains/**` へ段階的に集約していきます。
- DI の結合点は以下の通りです。
  - トークン: `src/types/symbol.ts`
  - 実装のバインド: `src/lib/inversify.config.ts`

参考図（Ports の位置づけ）:

```mermaid
graph LR
    subgraph UI
        C[React/Next.js]
    end

    subgraph Application
        AS[Application Service]
        AP[(Ports: I*ApplicationService / Handlers)]
    end

    subgraph Domain
        D[Entities/Domain Services]
        DP[(Ports: Repository/Factory Interfaces)]
    end

    subgraph Infrastructure
        R[Repository Impl]
        A[Adapters/External API]
    end

    C --> AS
    AS --> D
    AS --> DP
    AS --> AP
    R -.implements.-> DP
    A -.implements.-> AP
```

## 3. 主要コンポーネント関連図

```mermaid
graph LR
    subgraph "プロジェクト管理"
        Project[Project Entity]
        ProjectRepo[Project Repository]
        ProjectService[Project Service]
    end

    subgraph "WBS管理"
        WBS[WBS Entity]
        WbsRepo[WBS Repository]
        WbsService[WBS Service]
        Task[Task Entity]
        TaskRepo[Task Repository]
    end

    subgraph "スケジュール管理"
        Schedule[Schedule Service]
        Calendar[Calendar Service]
        Holiday[Company Holiday]
    end

    subgraph "リソース管理"
        User[User Entity]
        UserRepo[User Repository]
        Assignee[Assignee Service]
    end

    subgraph "進捗管理"
        Progress[Progress History]
        EVM[EVM Service]
        Gantt[Gantt Service]
    end

    subgraph "通知システム"
        Notification[Notification Service]
        Push[Push Notification]
    end

    Project --> WBS
    WBS --> Task
    Task --> Assignee
    Assignee --> User
    Task --> Schedule
    Schedule --> Calendar
    Calendar --> Holiday
    WBS --> Progress
    Progress --> EVM
    Task --> Gantt
    Progress --> Notification
    Task --> Notification
```

## 4. データフロー図

```mermaid
graph TD
    subgraph "入力"
        UserInput[ユーザー入力]
        FileImport[ファイルインポート]
        ExternalAPI[外部API]
    end

    subgraph "処理"
        Validation[検証処理]
        BusinessLogic[ビジネスロジック]
        Calculation[計算処理]
    end

    subgraph "永続化"
        Database[(データベース)]
        Cache[(キャッシュ)]
        FileSystem[ファイルシステム]
    end

    subgraph "出力"
        WebUI[Web UI]
        Report[レポート]
        Notification[通知]
        Export[エクスポート]
    end

    UserInput --> Validation
    FileImport --> Validation
    ExternalAPI --> Validation
    Validation --> BusinessLogic
    BusinessLogic --> Calculation
    BusinessLogic --> Database
    BusinessLogic --> Cache
    BusinessLogic --> FileSystem
    Database --> WebUI
    Cache --> WebUI
    Database --> Report
    Database --> Export
    BusinessLogic --> Notification
```

## 5. 認証・認可フロー

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextAuth
    participant API
    participant DB

    User->>Browser: ログインリクエスト
    Browser->>NextAuth: 認証要求
    NextAuth->>DB: 資格情報検証
    DB-->>NextAuth: 検証結果
    NextAuth-->>Browser: セッション作成
    Browser->>API: APIリクエスト（セッション付き）
    API->>NextAuth: セッション検証
    NextAuth-->>API: 認可情報
    API->>DB: データアクセス
    DB-->>API: データ返却
    API-->>Browser: レスポンス
    Browser-->>User: 画面表示
```

## 6. インポート処理フロー

インポートジョブは呼び出し元（画面・cron・Jenkins・curl）を問わず同じ API / Application Service で作成し、作成順に1件ずつ実行する。
定期インポート（ImportSchedule）はジョブを作成するだけで、インポートジョブ側は定期インポートに依存しない。

```mermaid
sequenceDiagram
    participant Client as 画面 / Jenkins / curl
    participant Cron as cron コンテナ（毎分）
    participant API as API Route / Server Action
    participant Schedule as ImportScheduleApplicationService
    participant Job as ImportJobApplicationService
    participant DB
    participant Notification

    Client->>API: POST /api/import-jobs（ジョブ作成）
    API->>Job: createJob
    Job->>DB: PENDING で登録
    Job->>Job: dispatchPendingJobs（実行中がなければ作成順に1件開始）
    Job-->>Client: ジョブID返却（完了は待たない）

    Cron->>API: POST /api/cron/import-schedules（CRON_SECRET）
    API->>Schedule: runDueSchedules（期限が来たWBSの予定）
    Schedule->>DB: 次回実行日時を条件付き更新（二重起動防止）
    Schedule->>Job: createJob（WBS同期 → 実績 前月・当月）
    API->>Job: dispatchPendingJobs（タイムアウトしたジョブの回収・待ち行列の再開）

    Job->>DB: WBS同期 / 実績取込
    Job->>DB: COMPLETED / FAILED、進捗記録
    Job->>Job: 次の実行待ちジョブを開始
    Job->>Notification: 完了・失敗通知
```

## 7. 依存性注入（DI）構成

```mermaid
graph TD
    subgraph "Inversify Container"
        Container[DI Container]
    end

    subgraph "Application Services"
        ProjectApp[ProjectApplicationService]
        WbsApp[WbsApplicationService]
        TaskApp[TaskApplicationService]
        DashboardApp[DashboardApplicationService]
    end

    subgraph "Domain Services"
        ScheduleGen[ScheduleGenerate]
        TaskFactory[TaskFactory]
        WbsSync[WbsSyncService]
    end

    subgraph "Repositories"
        ProjectRepo[ProjectRepository]
        WbsRepo[WbsRepository]
        TaskRepo[TaskRepository]
        UserRepo[UserRepository]
    end

    subgraph "Infrastructure"
        Prisma[Prisma Client]
    end

    Container --> ProjectApp
    Container --> WbsApp
    Container --> TaskApp
    Container --> DashboardApp
    Container --> ScheduleGen
    Container --> TaskFactory
    Container --> WbsSync
    Container --> ProjectRepo
    Container --> WbsRepo
    Container --> TaskRepo
    Container --> UserRepo
    ProjectRepo --> Prisma
    WbsRepo --> Prisma
    TaskRepo --> Prisma
    UserRepo --> Prisma
```

## 8. 主要機能の相関図

```mermaid
graph TB
    subgraph "コア機能"
        PM[プロジェクト管理]
        WM[WBS管理]
        TM[タスク管理]
    end

    subgraph "スケジューリング"
        AS[自動スケジューリング]
        GC[ガントチャート]
        CAL[カレンダー]
    end

    subgraph "リソース管理"
        UM[ユーザー管理]
        AM[担当者管理]
        WR[作業実績]
    end

    subgraph "分析・レポート"
        EVM[EVM分析]
        PH[進捗履歴]
    end

    subgraph "システム連携"
        IMP[インポート機能]
        EXP[エクスポート機能]
        NOT[通知システム]
    end

    PM --> WM
    WM --> TM
    TM --> AS
    AS --> GC
    AS --> CAL
    TM --> AM
    AM --> UM
    AM --> WR
    WR --> EVM
    TM --> PH
    PH --> EVM
    IMP --> WM
    IMP --> WR
    WM --> EXP
    PH --> NOT
    TM --> NOT
```

## 9. 技術スタック詳細

### フロントエンド

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Component Library**: Radix UI
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form + Zod
- **State Management**: TanStack Query
- **Table**: TanStack Table

### バックエンド

- **Runtime**: Node.js
- **API**: Next.js Server Actions / API Routes
- **ORM**: Prisma
- **Database**: PostgreSQL（主系）/ MySQL（Geppo参照用・読み取り専用）
- **DI Container**: Inversify

### インフラストラクチャ

- **Container**: Docker
- **File Storage**: ローカルファイルシステム
- **CI/CD**: GitHub Actions (想定)

### 開発ツール

- **Testing**: Jest, Playwright
- **Linting**: ESLint
- **Build Tool**: Turbopack
- **Package Manager**: npm

## 10. セキュリティアーキテクチャ（想定・整備中）

※以下は目標構成。レート制限・監査ログ等は未実装のものを含む。

```mermaid
graph TD
    subgraph "セキュリティレイヤー"
        Auth[認証]
        Authz[認可]
        Validation[入力検証]
        Sanitization[サニタイゼーション]
        Encryption[暗号化]
    end

    subgraph "セキュリティ機能"
        Session[セッション管理]
        CSRF[CSRF保護]
        XSS[XSS対策]
        SQLi[SQLインジェクション対策]
        RateLimit[レート制限]
    end

    Auth --> Session
    Authz --> Session
    Validation --> XSS
    Validation --> SQLi
    Sanitization --> XSS
    Encryption --> Session
    CSRF --> Session
    RateLimit --> Auth
```

## 11. デプロイメント構成（想定）

```mermaid
graph LR
    subgraph "開発環境"
        DevDB[(Dev DB)]
        DevApp[Dev App]
    end

    subgraph "ステージング環境"
        StgDB[(Staging DB)]
        StgApp[Staging App]
    end

    subgraph "本番環境"
        ProdDB[(Production DB)]
        ProdApp[Production App]
        Backup[(Backup)]
    end

    DevApp --> StgApp
    StgApp --> ProdApp
    ProdDB --> Backup
```

## 12. モニタリング・ログ構成（想定・未実装）

※現状は console ベースの ad hoc なログのみ（docs/08 §6 参照）。以下は目標構成。

```mermaid
graph TD
    subgraph "アプリケーション"
        App[Application]
        API[API]
        Worker[Background Worker]
    end

    subgraph "ログ収集"
        AppLog[Application Logs]
        ErrorLog[Error Logs]
        AccessLog[Access Logs]
        AuditLog[Audit Logs]
    end

    subgraph "モニタリング"
        Metrics[メトリクス]
        Alerts[アラート]
        Dashboard[ダッシュボード]
    end

    App --> AppLog
    API --> AccessLog
    Worker --> AppLog
    App --> ErrorLog
    API --> ErrorLog
    Worker --> ErrorLog
    API --> AuditLog
    AppLog --> Metrics
    ErrorLog --> Alerts
    Metrics --> Dashboard
```
