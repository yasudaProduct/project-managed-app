# ドメインモデル図

本プロジェクトのドメインモデルは、プロジェクト管理とタスク管理を中心としたクリーンアーキテクチャに基づいて設計されています。

## ドメインモデル図

```mermaid
classDiagram
    class Project {
        +id: string
        +name: string
        +status: ProjectStatus
        +description: string
        +startDate: Date
        +endDate: Date
        +create() Project
        +updateName() void
        +updateDescription() void
    }

    class ProjectStatus {
        +status: string
        +Name() string
    }

    class Wbs {
        +id: number
        +projectId: string
        +name: string
        +create() Wbs
        +updateName() void
    }

    class Task {
        +id: number
        +taskNo: TaskNo
        +wbsId: number
        +name: string
        +status: TaskStatus
        +phaseId: number
        +assigneeId: number
        +update() void
        +updateYotei() void
        +updateKijun() void
    }

    class TaskNo {
        <<ValueObject>>
    }

    class TaskStatus {
        <<ValueObject>>
        +getStatus() string
    }

    class Period {
        +id: number
        +startDate: Date
        +endDate: Date
        +type: PeriodType
        +create() Period
    }

    class PeriodType {
        <<ValueObject>>
        +type: string
    }

    class ManHour {
        +id: number
        +kosu: number
        +type: ManHourType
        +create() ManHour
    }

    class ManHourType {
        <<ValueObject>>
        +type: string
    }

    class Assignee {
        +id: number
        +name: string
        +displayName: string
        +create() Assignee
    }

    class User {
        +id: string
        +name: string
        +displayName: string
        +create() User
    }

    class AuthUser {
        +id: string
        +email: string
        +name: string
        +displayName: string
        +password: string
        +create() AuthUser
        +isEmailValid() boolean
    }

    class Phase {
        +id: number
        +name: string
        +code: PhaseCode
        +seq: number
        +create() Phase
    }

    class PhaseCode {
        <<ValueObject>>
    }

    class WorkRecord {
        +id: number
        +taskId: number
        +startDate: Date
        +endDate: Date
        +manHours: number
        +create() WorkRecord
    }

    class GeppoWorkEntry {
        +id: number
        +userId: string
        +projectCode: string
        +workDate: Date
        +workHours: number
    }

    Project ||--|| ProjectStatus
    Project ||--o{ Wbs
    Wbs ||--o{ Task
    Task ||--|| TaskNo
    Task ||--|| TaskStatus
    Task ||--o| Phase
    Task ||--o| Assignee
    Task ||--o{ Period
    Task ||--o{ WorkRecord
    Period ||--|| PeriodType
    Period ||--o{ ManHour
    ManHour ||--|| ManHourType
    Phase ||--|| PhaseCode
```

## ドメインモデルの説明

### 1. プロジェクト集約 (Project Aggregate)
- **Project**: プロジェクトのルートエンティティ
- **ProjectStatus**: プロジェクトの状態を表すバリューオブジェクト
- **Wbs**: プロジェクトに属するWork Breakdown Structure

### 2. タスク集約 (Task Aggregate)
- **Task**: タスクのルートエンティティ
- **TaskNo**: タスク番号を表すバリューオブジェクト
- **TaskStatus**: タスクの状態を表すバリューオブジェクト
- **Period**: 期間情報（予定、基準、実績）
- **ManHour**: 工数情報
- **PeriodType/ManHourType**: 期間・工数の種別を表すバリューオブジェクト

### 3. ユーザー集約 (User Aggregate)
- **User**: 一般ユーザーエンティティ
- **AuthUser**: 認証用ユーザーエンティティ
- **Assignee**: タスク担当者エンティティ
- **UserSession**: ユーザーセッション情報

### 4. フェーズ集約 (Phase Aggregate)
- **Phase**: プロジェクトフェーズエンティティ
- **PhaseCode**: フェーズコードバリューオブジェクト

### 5. 作業実績集約 (WorkRecord Aggregate)
- **WorkRecord**: 作業実績エンティティ

### 6. Geppo集約 (Geppo Aggregate)
- **GeppoWorkEntry**: 月報作業記録
- **GeppoProject**: 月報プロジェクト情報
- **GeppoUser**: 月報ユーザー情報

## アーキテクチャの特徴

### ドメイン駆動設計 (DDD)
- 各ドメインオブジェクトは関心の分離に従って設計
- エンティティとバリューオブジェクトの明確な区別
- 集約境界による整合性の保証

### クリーンアーキテクチャ
- ドメイン層は外部依存を持たない
- ビジネスロジックがドメインオブジェクトに集約
- 依存性注入による疎結合な設計

### 設計パターン
- **Factory Pattern**: オブジェクト生成の抽象化
- **Repository Pattern**: データアクセスの抽象化
- **Value Object Pattern**: 不変オブジェクトによる型安全性
- **Aggregate Pattern**: データ整合性の境界管理

## 技術的特徴

1. **型安全性**: TypeScriptによる静的型チェック
2. **不変性**: バリューオブジェクトの不変性保証
3. **カプセル化**: privateコンストラクタによる制御された生成
4. **検証**: ドメインルールの強制
5. **テスタビリティ**: 依存性注入による単体テスト容易性