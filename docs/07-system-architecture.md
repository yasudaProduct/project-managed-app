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
        Redis[(Redis Cache)]
        FileStorage[File Storage]
    end

    subgraph "外部システム"
        Email[メール配信]
        Auth[認証サービス]
        Geppo[月報システム]
        Excel[Excel連携]
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
    AS --> Redis
    AS --> ExtAPI
    ExtAPI --> Email
    ExtAPI --> Auth
    ExtAPI --> Geppo
    ExtAPI --> Excel
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
        Email[Email Service]
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

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant ImportJob
    participant Queue
    participant Worker
    participant DB
    participant Notification

    User->>UI: ファイルアップロード
    UI->>ImportJob: インポートジョブ作成
    ImportJob->>Queue: ジョブキュー登録
    ImportJob-->>UI: ジョブID返却
    Queue->>Worker: ジョブ実行
    Worker->>Worker: データ検証
    Worker->>DB: データ保存
    Worker->>ImportJob: 進捗更新
    Worker->>Notification: 完了通知
    Notification-->>User: 通知受信
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
        Redis[Redis Client]
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
    DashboardApp --> Redis
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
        QA[品質評価]
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
    EVM --> QA
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
- **API**: Next.js API Routes
- **ORM**: Prisma
- **Database**: PostgreSQL / MySQL
- **DI Container**: Inversify

### インフラストラクチャ
- **Container**: Docker
- **Cache**: Redis (オプション)
- **File Storage**: ローカルファイルシステム
- **CI/CD**: GitHub Actions (想定)

### 開発ツール
- **Testing**: Jest, Playwright
- **Linting**: ESLint
- **Build Tool**: Turbopack
- **Package Manager**: npm

## 10. セキュリティアーキテクチャ

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

## 12. モニタリング・ログ構成

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