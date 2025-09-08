# インポートAPI ドキュメント

## 概要

MySQLのWBSテーブルとGeppoテーブルからのインポート機能をCronやJenkinsからAPI呼び出しで実行できるエンドポイントです。

## 環境変数

特別な環境変数の設定は不要です。

## Geppoインポート API

### プロジェクト一覧取得

**GET** `/api/import/geppo?targetMonth=2024-12`

指定された月の利用可能なプロジェクト一覧を取得します。

#### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| targetMonth | string | ✓ | インポート対象月 (YYYY-MM) |

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "projectId": "1",
        "projectName": "プロジェクトA",
        "geppoProjectIds": ["100", "101"],
        "recordCount": 150,
        "userCount": 5,
        "mappingStatus": "mapped"
      }
    ]
  },
  "message": "Projects retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### インポート実行

**POST** `/api/import/geppo`

Geppoインポートを実行します。

#### リクエストボディ

```json
{
  "targetMonth": "2024-12",
  "targetProjectNames": ["プロジェクトA", "プロジェクトB"],
  "updateMode": "replace",
  "dryRun": false,
  "skipValidation": false
}
```

#### パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| targetMonth | string | ✓ | - | インポート対象月 (YYYY-MM) |
| targetProjectNames | string[] | - | null | 対象プロジェクト名配列（未指定時は全プロジェクト） |
| updateMode | string | - | "replace" | 更新モード（"replace"のみサポート） |
| dryRun | boolean | - | false | ドライラン実行 |
| skipValidation | boolean | - | false | バリデーションスキップ |

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "successCount": 145,
    "createdCount": 145,
    "updatedCount": 0,
    "errorCount": 5,
    "errors": [
      {
        "recordId": "user123 - 2024-12-01",
        "message": "Invalid work hours",
        "details": {
          "memberId": "user123",
          "date": "2024-12-01",
          "originalError": {}
        }
      }
    ],
    "executionTime": 5432
  },
  "message": "Import completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## WBSインポート API

### WBS同期プレビュー取得

**GET** `/api/import/wbs?wbsId=1`

WBS同期のプレビュー情報を取得します。

#### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| wbsId | number | ✓ | WBS ID |

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "preview": {
      "toAdd": 10,
      "toUpdate": 5,
      "toDelete": 2,
      "validationErrors": [],
      "newPhases": [
        {
          "name": "新フェーズ",
          "code": "P001"
        }
      ],
      "newUsers": [],
      "details": {
        "toAdd": [
          {
            "wbsId": "1.1",
            "taskName": "新タスク",
            "phase": "開発",
            "assignee": "田中太郎"
          }
        ],
        "toUpdate": [],
        "toDelete": []
      }
    },
    "lastSync": {
      "syncedAt": "2024-01-01T00:00:00.000Z",
      "recordCount": 15,
      "syncStatus": "SUCCESS"
    },
    "wbsInfo": {
      "id": 1,
      "name": "プロジェクトA WBS",
      "projectId": 1
    }
  },
  "message": "WBS sync preview retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### WBS同期実行

**POST** `/api/import/wbs`

WBS同期を実行します。

#### リクエストボディ

```json
{
  "wbsId": 1,
  "syncMode": "replace",
  "skipValidation": false
}
```

#### パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| wbsId | number | ✓ | - | WBS ID |
| syncMode | string | - | "replace" | 同期モード（"replace"のみサポート） |
| skipValidation | boolean | - | false | バリデーションスキップ |

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "successCount": 17,
    "createdCount": 10,
    "updatedCount": 5,
    "errorCount": 0,
    "errors": [],
    "executionTime": 2341
  },
  "message": "WBS sync completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## エラーレスポンス

すべてのエラーは以下の形式で返されます：

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### HTTPステータスコード

| コード | 説明 |
|---|---|
| 200 | 成功 |
| 400 | リクエストパラメータエラー |
| 404 | リソースが見つからない |
| 422 | バリデーションエラー |
| 500 | サーバーエラー |

## Cronでの使用例

### Geppoインポートの定期実行

```bash
# 毎月1日の午前2時に前月のデータをインポート
0 2 1 * * /usr/bin/curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "targetMonth": "'$(date -d "last month" +%Y-%m)'",
    "updateMode": "replace",
    "skipValidation": false
  }' \
  https://your-domain.com/api/import/geppo
```

### WBSインポートの定期実行

```bash
# 毎日午前3時にWBS同期
0 3 * * * /usr/bin/curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "wbsId": 1,
    "syncMode": "replace",
    "skipValidation": true
  }' \
  https://your-domain.com/api/import/wbs
```

## Jenkinsでの使用例

### Jenkinsfile (Geppoインポート)

```groovy
pipeline {
    agent any
    
    environment {
        API_KEY = credentials('api-key')
        BASE_URL = 'https://your-domain.com'
    }
    
    triggers {
        cron('0 2 1 * *') // 毎月1日の午前2時
    }
    
    stages {
        stage('Geppo Import') {
            steps {
                script {
                    def targetMonth = sh(
                        script: "date -d 'last month' +%Y-%m",
                        returnStdout: true
                    ).trim()
                    
                    def response = httpRequest(
                        httpMode: 'POST',
                        url: "${BASE_URL}/api/import/geppo",
                        customHeaders: [
                            [name: 'Content-Type', value: 'application/json']
                        ],
                        requestBody: """
                        {
                            "targetMonth": "${targetMonth}",
                            "updateMode": "replace",
                            "skipValidation": false
                        }
                        """
                    )
                    
                    def result = readJSON text: response.content
                    
                    if (!result.success) {
                        error("Import failed: ${result.error}")
                    }
                    
                    echo "Import completed: ${result.data.successCount} records processed"
                }
            }
        }
    }
    
    post {
        success {
            emailext(
                subject: "Geppo Import Successful",
                body: "Monthly Geppo import completed successfully.",
                to: "admin@company.com"
            )
        }
        failure {
            emailext(
                subject: "Geppo Import Failed",
                body: "Monthly Geppo import failed. Check Jenkins logs for details.",
                to: "admin@company.com"
            )
        }
    }
}
```


## セキュリティ考慮事項

1. **ログ監視**: APIアクセスログを監視し、異常なアクセスを検知してください
2. **ネットワーク制限**: 必要に応じてファイアウォール等でアクセス制御を行ってください

## トラブルシューティング

### よくあるエラー

1. **422 Validation failed**: データの整合性エラー、バリデーションログを確認
2. **500 Internal server error**: サーバー側エラー、ログを確認

### デバッグ方法

1. まずGETエンドポイントでデータを確認
2. `dryRun: true`でテスト実行
3. `skipValidation: true`でバリデーションエラーを回避（注意して使用）