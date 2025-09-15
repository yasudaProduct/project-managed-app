// Geppo月報システムのインポート結果ドメインタイプ定義

export interface GeppoImportOptions {
  targetMonth?: string       // YYYY-MM形式（省略時は全期間）
  memberIds?: string[]       // 対象メンバーID（空の場合は全員）
  projectIds?: string[]      // 対象プロジェクトID（空の場合は全プロジェクト）
  targetProjectNames?: string[]  // インポート対象のprojects.name（複数選択可能）
  dryRun: boolean           // ドライラン実行フラグ
  updateMode: 'merge' | 'replace'  // merge: 既存データを更新、replace: 月単位で置換
}

export interface GeppoImportRecord {
  memberId: string
  memberName?: string
  projectId?: string
  wbsNo?: string
  workName?: string
  date: Date
  hoursWorked: number       // 分単位
}

export interface GeppoImportResult {
  totalGeppoRecords: number        // 処理対象Geppoレコード数
  totalWorkRecords: number         // 生成されたWorkRecordレコード数
  successCount: number             // 成功したレコード数
  errorCount: number               // エラーレコード数
  skippedCount: number             // スキップしたレコード数（作業時間0分など）
  createdCount: number             // 新規作成されたレコード数
  updatedCount: number             // 更新されたレコード数
  deletedCount: number             // 削除されたレコード数（replaceモード時）
  errors: GeppoImportError[]       // エラー詳細
  importedRecords: GeppoImportRecord[]  // インポートされたレコード（ドライラン時のみ）
}

export interface GeppoImportError {
  memberId: string
  projectId?: string
  date: Date
  errorType: 'USER_NOT_FOUND' | 'PROJECT_NOT_FOUND' | 'TASK_NOT_FOUND' | 'INVALID_DATA' | 'DB_ERROR'
  message: string
  originalData?: unknown
}

export interface GeppoImportValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  
  // ユーザーマッピング結果
  userMapping: {
    totalUsers: number
    mappedUsers: number
    unmappedUsers: string[]
    mappingRate: number
  }
  
  // プロジェクトマッピング結果  
  projectMapping: {
    totalProjects: number
    mappedProjects: number
    unmappedProjects: string[]
    mappingRate: number
  }
  
  // タスクマッピング結果
  taskMapping: {
    totalTasks: number
    mappedTasks: number
    unmappedTasks: string[]
    mappingRate: number
  }
  
  // データ統計
  statistics: {
    totalGeppoRecords: number
    expectedWorkRecords: number
    projectBreakdown: Array<{
      projectId: string
      recordCount: number
      userCount: number
      mappingStatus: 'mapped' | 'unmapped' | 'partial'
    }>
  }
}

export interface GeppoImportPreview {
  validation: GeppoImportValidation
  sampleRecords: GeppoImportRecord[]  // 最初の10件程度
  summary: {
    totalWorkRecords: number
    byProject: Map<string, number>
    byUser: Map<string, number>
    byDate: Map<string, number>
  }
}

export interface ProjectImportOption {
  projectId: string           // projects.id
  projectName: string         // projects.name
  geppoProjectIds: string[]   // 対応するgeppo.PROJECT_IDの配列
  recordCount: number         // 該当するGeppoレコード数
  userCount: number           // 該当するユーザー数
  mappingStatus: 'mapped' | 'unmapped' | 'partial'
}

export interface ProjectMappingValidation {
  totalProjects: number
  mappedCount: number
  unmappedCount: number
  mappedProjects: string[]
  unmappedProjects: string[]
  mappingRate: number  // 0.0 - 1.0
}