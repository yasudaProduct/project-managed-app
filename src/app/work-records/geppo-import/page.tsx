'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  validateGeppoImport, 
  previewGeppoImport, 
  executeGeppoImport,
  getAvailableProjectsForImport
} from '@/app/actions/geppo-import'
import { ProjectImportOption } from '@/domains/geppo-import/geppo-import-result'
import { ImportWizard, ImportProject, ImportValidation, ImportPreview, ImportResult } from '@/components/common/import-wizard/ImportWizard'

export default function GeppoImportPage() {
  // プロジェクトロード時のマッピング
  const handleLoadProjects = async (targetMonth: string): Promise<ImportProject[]> => {
    const projects = await getAvailableProjectsForImport(targetMonth)
    return projects.map((project: ProjectImportOption) => ({
      id: project.projectName,
      name: project.projectName,
      available: true,
      mappingStatus: project.mappingStatus,
      additionalInfo: {
        geppoProjectIds: project.geppoProjectIds,
        recordCount: project.recordCount,
        userCount: project.userCount
      }
    }))
  }

  // バリデーション処理のマッピング
  const handleValidate = async ({ selectedProjects, targetMonth }: { selectedProjects: string[]; targetMonth: string }): Promise<ImportValidation> => {
    const validationResult = await validateGeppoImport({
      targetMonth,
      updateMode: 'replace',
      targetProjectNames: selectedProjects.length > 0 ? selectedProjects : undefined,
      dryRun: false
    })

    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      mappingInfo: {
        ユーザー: {
          totalCount: validationResult.userMapping.totalUsers,
          mappedCount: validationResult.userMapping.mappedUsers,
          mappingRate: validationResult.userMapping.mappingRate
        },
        プロジェクト: {
          totalCount: validationResult.projectMapping.totalProjects,
          mappedCount: validationResult.projectMapping.mappedProjects,
          mappingRate: validationResult.projectMapping.mappingRate
        },
        タスク: {
          totalCount: validationResult.taskMapping.totalTasks,
          mappedCount: validationResult.taskMapping.mappedTasks,
          mappingRate: validationResult.taskMapping.mappingRate
        }
      }
    }
  }

  // プレビュー処理のマッピング
  const handlePreview = async ({ selectedProjects, targetMonth }: { selectedProjects: string[]; targetMonth: string }): Promise<ImportPreview> => {
    const previewResult = await previewGeppoImport({
      targetMonth,
      updateMode: 'replace',
      targetProjectNames: selectedProjects.length > 0 ? selectedProjects : undefined,
      dryRun: false
    })

    return {
      summary: {
        totalRecords: previewResult.summary.totalWorkRecords
      },
      sampleData: previewResult.sampleRecords,
      additionalInfo: previewResult.summary
    }
  }

  // インポート実行処理のマッピング
  const handleExecute = async ({ selectedProjects, targetMonth, dryRun }: { selectedProjects: string[]; targetMonth: string; dryRun?: boolean }): Promise<ImportResult> => {
    const importResult = await executeGeppoImport({
      targetMonth,
      updateMode: 'replace',
      targetProjectNames: selectedProjects.length > 0 ? selectedProjects : undefined,
      dryRun: dryRun || false
    })

    return {
      successCount: importResult.successCount,
      createdCount: importResult.createdCount,
      updatedCount: importResult.updatedCount,
      errorCount: importResult.errorCount,
      errors: importResult.errors.map(error => ({
        recordId: `${error.memberId} - ${error.date?.toLocaleDateString()}`,
        message: error.message,
        details: error
      }))
    }
  }

  // カスタムプロジェクトレンダラー
  const projectRenderer = (project: ImportProject, isSelected: boolean) => (
    <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent">
      <div className="flex items-center space-x-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => {}}
        />
        <div>
          <div className="font-medium">{project.name}</div>
          {project.additionalInfo?.geppoProjectIds && 
           Array.isArray(project.additionalInfo.geppoProjectIds) && 
           (project.additionalInfo.geppoProjectIds as string[]).length > 0 ? (
            <div className="text-sm text-muted-foreground">
              Geppo IDs: {(project.additionalInfo.geppoProjectIds as string[]).join(', ')}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {project.additionalInfo?.recordCount !== undefined && typeof project.additionalInfo.recordCount === 'number' && (
          <Badge variant="secondary">{project.additionalInfo.recordCount}件</Badge>
        )}
        {project.additionalInfo?.userCount !== undefined && typeof project.additionalInfo.userCount === 'number' && (
          <Badge variant="outline">{project.additionalInfo.userCount}ユーザー</Badge>
        )}
        <Badge variant={project.mappingStatus === 'mapped' ? 'default' : 'destructive'}>
          {project.mappingStatus === 'mapped' ? 'マップ済み' : '未マップ'}
        </Badge>
      </div>
    </div>
  )

  // カスタムプレビューレンダラー
  const previewRenderer = (preview: ImportPreview) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">作成予定ワークレコード数</h4>
          <div className="text-3xl font-bold">{preview.summary.totalRecords}件</div>
        </div>
      </div>

      {preview.sampleData && preview.sampleData.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">サンプルレコード（最初の10件）</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">メンバーID</th>
                  <th className="text-left p-2">日付</th>
                  <th className="text-left p-2">工数</th>
                </tr>
              </thead>
              <tbody>
                {preview.sampleData.map((record, index) => {
                  const typedRecord = record as { memberId: string; date: string; hoursWorked: number }
                  return (
                    <tr key={index} className="border-t">
                      <td className="p-2">{typedRecord.memberId}</td>
                      <td className="p-2">{new Date(typedRecord.date).toLocaleDateString()}</td>
                      <td className="p-2">{typedRecord.hoursWorked}時間</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )

  // カスタム結果レンダラー
  const resultRenderer = (result: ImportResult) => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{result.successCount}</div>
          <div className="text-sm text-muted-foreground">成功</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{result.createdCount}</div>
          <div className="text-sm text-muted-foreground">作成</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{result.updatedCount}</div>
          <div className="text-sm text-muted-foreground">更新</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{result.errorCount}</div>
          <div className="text-sm text-muted-foreground">エラー</div>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-destructive">エラー詳細</h4>
          {result.errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <AlertDescription>
                {error.recordId}: {error.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Alert>
        <AlertDescription>
          インポートが完了しました。ワークレコード画面で結果を確認してください。
        </AlertDescription>
      </Alert>
    </>
  )

  return (
    <div className="container mx-auto py-6">
      <ImportWizard
        title="月報インポート"
        description="月報データをインポートします"
        onLoadProjects={handleLoadProjects}
        projectSelectionMode="multiple"
        onValidate={handleValidate}
        onPreview={handlePreview}
        onExecute={handleExecute}
        projectRenderer={projectRenderer}
        previewRenderer={previewRenderer}
        resultRenderer={resultRenderer}
      />
    </div>
  )
}