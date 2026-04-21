定量品質管理の動作確認用サンプルです（quality_* テーブルへの直接シードは含みません）。

■ MySQL wbs（品質評価対象の同期元）
  - ファイル: mysql-wbs-quality-eval-sample.tsv
  - WBS インポート完了後、API から SyncQualityTargetsService.syncForWbs が
    PostgreSQL に取り込まれた WbsTask を読み、同一 WBS 内に taskNo が
    「{自taskNo}-R...」の形式で前方一致する別の WbsTask が 1 件以上存在する
    タスクを評価対象（1 タスク = 1 評価対象）として登録します。
  - レビュータスク = 上記前方一致で抽出された別の WbsTask。そのレビュータスクの
    担当者 (TANTO) がレビュアー（reviewerUserId = Users.id）になります。
    担当者が設定されていないレビュータスクはスキップされます。
  - 評価対象の正は「-R レビュータスクが存在するか」のみで判定します。
    WbsTask 側に評価対象フラグとなる列は存在しません。
  - ExcelWbsRepository.findByWbsName の実装では、引数 wbsName に対して
    MySQL の PROJECT_ID 列で一致検索しています。そのため PostgreSQL 側の
    WBS 名（prisma/mock-data の「新規機能開発A」など）と MySQL の PROJECT_ID を
    同じ文字列にしてください。

■ 品質画面の CSV インポート（指摘・規模）
  - quality-findings-import-sample.csv … 評価対象の taskNo に紐づく指摘
  - quality-size-metrics-import-sample.csv … 規模メトリクス（PAGE / LOC / テストケース）
  - いずれも品質ダッシュボードのインポート UI から取り込み可能です。
  - 指摘・規模の taskNo は、上記同期後に存在する評価対象の番号
    （例: D2-0001, D3-0001, D4-0001）に合わせています。

■ scripts/seed-mysql.ts
  - 同内容の行を MySQL シードにも追加してあり、docker の geppo DB に流し込むと
    WBS 名が「新規機能開発A」の PostgreSQL WBS（通常は id=1）と突合できます。
