# コーディング規約（TypeScript/Next.js）

## Typescript

### 命名規則

#### 基本

- 型/インターフェイス/クラス: PascalCase（例: User, UserRepository, CreateUserInput）
- 変数/関数/メソッド/プロパティ: camelCase（例: userName, createUser）
- 定数/環境・ビルド時定数: UPPER_SNAKE_CASE（例: API_BASE_URL, NODE_ENV）

#### ブール値

- 肯定形で接頭辞を付ける: is*/has*/can*/should*（例: isEnabled, hasAccess）
- 否定名は避ける（isNot*ではなくis*で表現）

#### 関数の命名

- getX/fetchX: 失敗時は例外を投げる
- findX: 見つからない場合はnull | undefinedを返す
- listX: 複数取得（`ReadonlyArray<T>`を返す）
- create/update/delete: 変更系
- 例外を投げない安全APIはtryX/safeXで明示（Result型などと併用）

#### 非同期

- 基本は動詞のみ（createUser）。
    「同期版と非同期版が併存」する時のみAsyncサフィックスを使用（例: readFile/readFileAsync）

#### 集合/配列・単位

- 複数は複数形（users）
- 単位はサフィックスで明示（timeoutMs, sizeBytes, ratioPct）

#### イベント/ハンドラ

- イベント名: userCreated, orderPaid
- ハンドラ: 外部に公開する受け口はonX、内部実装はhandleX

```typescript
function onUserCreated(e: UserCreatedEvent) {}
function handleUserCreated(e: UserCreatedEvent) {}
```

#### 型エイリアスの接尾辞（役割を明示）

- *DTO（外部契約）,*Input/*Params（入力）,*Options（オプション）, *Result（戻り値/結果）,*Error（エラー）
- 例: CreateUserInput, UserDTO, FetchUsersOptions, GetUserResult, PermissionDeniedError

#### ファイル/ディレクトリ

- TypeScript: kebab-case.ts
- Reactコンポーネント: PascalCase.tsx（コンポーネント名と一致）
- テスト: *.test.ts または*.spec.ts（プロジェクトで統一）
- 型のみ: *.types.ts
- ユーティリティ: *.utils.ts
- Next.js の規約ファイル（route.ts, page.tsxなど）はフレームワーク規約を優先

#### 禁止・注意

- 曖昧な名前（data, value, itemのみ）は避け、文脈語を付与（userData, orderItem）
- 二重否定や略語乱用を避ける
- ブール引数の多用は避け、Optionsオブジェクト化する

---

### 共通

- Strict TypeScript（`strict: true`）
- `@ts-ignore`などの型エラー無視を禁止
- `@ts-expect-error`は根拠コメント必須
- 公開APIの型安定: 外部に見える型は意図的に固定し、破壊的変更を避ける。

    ```typescript
    // NG: 内部のDomain型がそのまま漏れている
    export function getUser(): User { // User(内部)を変えると外部が壊れる
    return userRepo.find();
    }

    // OK: 外部契約のDTOを固定
    export type UserDTO = Readonly<{
    id: string;
    name: string;
    }>;
    export function getUser(): UserDTO {
    const u = userRepo.find();
    return { id: u.id, name: u.displayName };
    }
    ```

- 境界で型を固める: I/O境界（API/DB/外部入力）でバリデーション・ナローイング。
    外から入る/外へ出すデータは境界で検証・型ナローイングし、内部は「信頼できる型」だけで扱うようにする。
- 表明より導出: 型はなるべく推論させ、必要な所だけ明示。
  - ローカルは推論

    ```typescript
    // NG（冗長）:
    const count: number = 0;
    // OK:
    const count = 0;
    ```

  - 公開関数の戻り値は明示

    ```typescript
    // OK:
    export function sum(a: number, b: number): number {
    return a + b;
    }
    // 内部関数は推論でOK(任意とする)
    // 理由:利用範囲が限定され、実装と同時に呼び出し側のリファクタ可能。推論で冗長さを減らし、生産性を上られるため。
    function mul(a: number, b: number) { return a * b; }
    ```

  - コールバック引数は推論

    ```typescript
    const xs = [1, 2, 3];
    // NG（冗長）:
    xs.map((n: number) => n * 2);
    // OK:
    xs.map(n => n * 2);
    ```

  - 空配列/空オブジェクトは注釈で初期化し導出（アサーションより）

    ```typescript
    // NG（アサーション依存）:
    const names = [] as string[];
    // OK
    const names: string[] = [];
    // オブジェクトも同様
    const userById: Record<string, User> = {};
    ```

  - オブジェクトリテラルは`satisfies`で形チェックしつつリテラル型を保持(推奨)

    ```typescript
    type Mode = 'safe' | 'fast';
    type Config = { retries: number; mode: Mode }; 

    // 形は合うが、mode は 'safe' | 'fast' に広がる
    const cfg1: Config = { retries: 3, mode: 'safe' };
    // cfg1.mode の型: 'safe' | 'fast'

    // satisfies: 形は検証、mode は 'safe' のまま保持
    const cfg2 = { retries: 3, mode: 'safe' } satisfies Config;
    // cfg2.mode の型: 'safe'（リテラル保持）

    function setMode(m: Mode) { // 省略 // }
    setMode(cfg2.mode); // OK（'safe' ⊆ Mode）
    ```

  - リテラル集合は`as const` + ユニオン導出

    ```typescript
    export const Roles = ['admin', 'member', 'guest'] as const;
    export type Role = (typeof Roles)[number];

    export function setRole(r: Role) {}
    setRole('admin'); // OK
    setRole('owner'); // 型エラー
    ```

  - 返却の明示（型が広がりやすい箇所）

    ```typescript
    // OK: 公開APIは戻り値を固定
    export function createUser(input: CreateUserInput): Promise<UserDTO> {
    }
    ```

  - 不要なアサーションを避ける

    ```typescript
    // NG:
    const el = document.getElementById('app') as HTMLDivElement;
    // OK（型ガードで導出）:
    const el = document.getElementById('app');
    if (el instanceof HTMLDivElement) {
        el.style.display = 'none';
    }
    ```

### 型設計

- type vs interface
  - interface: 公開オブジェクト形状、拡張/宣言マージしたいとき
  - type: ユニオン/交差/関数型/条件型/テンプレートリテラル型
- ユニオン/判別共用体: 安全な状態機械を表現。全列挙で網羅。
- readonly/as const: 変更不可をデフォルトに近づける（データ構造の防御的設計）。
- enumは原則非推奨: 代替としてユニオン＋as const。

### 関数/API設計

- 公開関数は戻り値型を明示。内部は推論任せ可。

## Next.js

### Pageファイルのルール

- 命名/配置
  - ルートはディレクトリkebab-case、page.tsx固定（app/users/page.tsx）。
  - UI断片はページ直下にコンポーネントへ分離（PascalCase.tsx）。

- Props定義（params/searchParams）
  - 型は明示。paramsはstringのみ（Next仕様）。searchParamsはstring|string[]|undefined。
  - zodでsearchParamsを境界バリデーションし、内部型へナローイング。

- アンチパターン
  - 大量ロジックをpageに直書き（サービス層へ分離）。
  - searchParamsを未検証で使用。

#### コンポーネントの配置（page.tsxからの切り出し）

- 原則
  - そのページ特有のUIは「同じルートセグメント配下」に配置する。
  - 推奨: 同階層に _components フォルダを作り、その中に置く。
    - 例: app/users/page.tsx → app/users/_components/UserTable.tsx
    - 下線始まりは慣例（ルーティング対象外であることを示す目的）。Next.jsの必須要件ではない。

- 共有度別の配置ルール
  - ページ専用（1ページでのみ使用）
    - app/xxx/_components/ 配下に配置。
  - 機能横断（同一機能内の複数ページで共有）
    - app/xxx/_components/ 配下に配置し、同機能内から参照。
  - 全体共有（アプリ全体で再利用）
    - src/components/ 配下に昇格して配置（プロジェクト共通のUIライブラリ）。

- サーバー/クライアント境界
  - page.tsxはサーバーコンポーネント（'use client'禁止）。
  - クライアントが必要なUIは子コンポーネント側で 'use client' を宣言して分離。
  - server-only な実装はpage側またはサーバーコンポーネント側に保持し、クライアントからは直接importしない。

- インポート方針
  - 同一セグメント内は相対パスでOK。
  - 他セグメントの私有コンポーネントへは依存しない（共有したい場合は昇格してから参照）。
  - 全体共有はパスエイリアス（@/components/...）を使用。

### バリデーション

- 入力値（クエリパラメータ、フォームデータ、APIリクエストボディなど）は必ずバリデーションを行う。
- Zodを使用してスキーマ定義とバリデーションを行う。

### Server Action
