'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Upload,
  ArrowRight
} from 'lucide-react'

export interface ImportProject {
  id: string
  name: string
  available?: boolean
  mappingStatus?: 'mapped' | 'unmapped' | 'partial'
  additionalInfo?: Record<string, unknown>
}

export interface ImportValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  mappingInfo?: {
    [key: string]: {
      totalCount: number
      mappedCount: number
      mappingRate: number
    }
  }
}

export interface ImportPreview {
  summary: {
    totalRecords: number
    toAdd?: number
    toUpdate?: number
    toDelete?: number
  }
  sampleData?: unknown[]
  additionalInfo?: Record<string, unknown>
}

export interface ImportResult {
  successCount: number
  createdCount: number
  updatedCount: number
  errorCount: number
  errors: Array<{
    recordId?: string
    message: string
    details?: unknown
  }>
}

export interface ImportWizardProps {
  title: string
  description?: string
  
  // Step 1: プロジェクト選択
  onLoadProjects: (targetMonth: string) => Promise<ImportProject[]>
  projectSelectionMode?: 'single' | 'multiple'
  
  // Step 2: バリデーション
  onValidate: (params: {
    selectedProjects: string[]
    targetMonth: string
    additionalParams?: unknown
  }) => Promise<ImportValidation>
  
  // Step 3: プレビュー
  onPreview?: (params: {
    selectedProjects: string[]
    targetMonth: string
    additionalParams?: unknown
  }) => Promise<ImportPreview>
  
  // Step 4: インポート実行
  onExecute: (params: {
    selectedProjects: string[]
    targetMonth: string
    dryRun?: boolean
    additionalParams?: unknown
  }) => Promise<ImportResult>
  
  // カスタムコンポーネント
  additionalSettings?: React.ReactNode
  projectRenderer?: (project: ImportProject, isSelected: boolean) => React.ReactNode
  validationRenderer?: (validation: ImportValidation) => React.ReactNode
  previewRenderer?: (preview: ImportPreview) => React.ReactNode
  resultRenderer?: (result: ImportResult) => React.ReactNode
}

export function ImportWizard({
  title,
  description,
  onLoadProjects,
  projectSelectionMode = 'multiple',
  onValidate,
  onPreview,
  onExecute,
  additionalSettings,
  projectRenderer,
  validationRenderer,
  previewRenderer,
  resultRenderer,
}: ImportWizardProps) {
  const [targetMonth, setTargetMonth] = useState('')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [availableProjects, setAvailableProjects] = useState<ImportProject[]>([])
  const [validation, setValidation] = useState<ImportValidation | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const handleLoadProjects = async () => {
    if (!targetMonth) {
      alert('対象月を入力してください')
      return
    }

    setLoading(true)
    try {
      const projects = await onLoadProjects(targetMonth)
      setAvailableProjects(projects)
      if (projects.length > 0) {
        setCurrentStep(2)
      } else {
        alert('利用可能なプロジェクトがありません')
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
      alert('プロジェクト取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    setLoading(true)
    try {
      const validationResult = await onValidate({
        selectedProjects,
        targetMonth,
      })
      setValidation(validationResult)
      setCurrentStep(3)
    } catch (error) {
      console.error('Failed to validate:', error)
      alert('バリデーションに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    if (!onPreview) {
      setCurrentStep(4)
      return
    }

    setLoading(true)
    try {
      const previewResult = await onPreview({
        selectedProjects,
        targetMonth,
      })
      setPreview(previewResult)
      setCurrentStep(4)
    } catch (error) {
      console.error('Failed to get preview:', error)
      alert('プレビュー取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async (dryRun: boolean = false) => {
    if (!validation?.isValid && !dryRun) {
      alert('バリデーションエラーがあるため実行できません')
      return
    }

    setLoading(true)
    try {
      const importResult = await onExecute({
        selectedProjects,
        targetMonth,
        dryRun,
      })
      setResult(importResult)
      setCurrentStep(5)
    } catch (error) {
      console.error('Failed to execute import:', error)
      alert('インポート実行に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectToggle = (projectId: string) => {
    if (projectSelectionMode === 'single') {
      setSelectedProjects([projectId])
    } else {
      setSelectedProjects(prev => 
        prev.includes(projectId) 
          ? prev.filter(p => p !== projectId)
          : [...prev, projectId]
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center justify-between mb-8">
        {[
          { step: 1, label: '設定' },
          { step: 2, label: 'プロジェクト選択' },
          { step: 3, label: 'バリデーション' },
          { step: 4, label: 'プレビュー' },
          { step: 5, label: '実行結果' },
        ].map((item, index) => (
          <div key={item.step} className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${currentStep >= item.step
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
              }
            `}>
              {currentStep > item.step ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <span className="text-sm font-semibold">{item.step}</span>
              )}
            </div>
            <span className={`ml-2 text-sm ${
              currentStep >= item.step ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {item.label}
            </span>
            {index < 4 && (
              <ArrowRight className="w-4 h-4 mx-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Step 1: 基本設定 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>基本設定</CardTitle>
              <CardDescription>インポートの基本設定を行います</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="targetMonth" className="text-sm font-medium">
                  対象月 (YYYY-MM)
                </label>
                <input
                  id="targetMonth"
                  type="month"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                />
              </div>

              {additionalSettings}

              <Button onClick={handleLoadProjects} disabled={loading || !targetMonth}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    プロジェクト取得中...
                  </>
                ) : (
                  <>
                    プロジェクト一覧を取得
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: プロジェクト選択 */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>インポート対象プロジェクト選択</CardTitle>
              <CardDescription>
                {projectSelectionMode === 'single' 
                  ? 'インポートするプロジェクトを選択してください'
                  : 'インポートするプロジェクトを選択してください（未選択の場合は全プロジェクト）'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {availableProjects.length}件のプロジェクトが利用可能
                </span>
                {projectSelectionMode === 'multiple' && (
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedProjects([])}>
                      すべて解除
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedProjects(availableProjects.map(p => p.id))}>
                      すべて選択
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                {availableProjects.map((project) => {
                  const isSelected = selectedProjects.includes(project.id)
                  
                  if (projectRenderer) {
                    return (
                      <div
                        key={project.id}
                        className="cursor-pointer"
                        onClick={() => handleProjectToggle(project.id)}
                      >
                        {projectRenderer(project, isSelected)}
                      </div>
                    )
                  }

                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => handleProjectToggle(project.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type={projectSelectionMode === 'single' ? 'radio' : 'checkbox'}
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4"
                        />
                        <div>
                          <div className="font-medium">{project.name}</div>
                        </div>
                      </div>
                      {project.mappingStatus && (
                        <Badge variant={project.mappingStatus === 'mapped' ? 'default' : 'destructive'}>
                          {project.mappingStatus === 'mapped' ? 'マップ済み' : '未マップ'}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>

              <Separator />

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  戻る
                </Button>
                <Button onClick={handleValidate} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      バリデーション中...
                    </>
                  ) : (
                    <>
                      バリデーション実行
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: バリデーション */}
        {currentStep === 3 && validation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                バリデーション結果
                <Badge variant={validation.isValid ? 'default' : 'destructive'}>
                  {validation.isValid ? '正常' : 'エラーあり'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationRenderer ? (
                validationRenderer(validation)
              ) : (
                <>
                  {validation.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-destructive">エラー</h4>
                      {validation.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {validation.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-yellow-600">警告</h4>
                      {validation.warnings.map((warning, index) => (
                        <Alert key={index}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {validation.mappingInfo && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(validation.mappingInfo).map(([key, info]) => (
                        <Card key={key}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{key}マッピング</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{Math.round(info.mappingRate * 100)}%</div>
                            <div className="text-sm text-muted-foreground">
                              {info.mappedCount}/{info.totalCount}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  戻る
                </Button>
                {onPreview && (
                  <Button variant="outline" onClick={handlePreview} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        プレビュー作成中...
                      </>
                    ) : (
                      'プレビュー表示'
                    )}
                  </Button>
                )}
                <Button onClick={() => handleExecute(true)} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ドライラン実行中...
                    </>
                  ) : (
                    'ドライラン実行'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: プレビュー */}
        {currentStep === 4 && (preview || !onPreview) && (
          <Card>
            <CardHeader>
              <CardTitle>インポートプレビュー</CardTitle>
              <CardDescription>インポート内容の確認</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview && previewRenderer ? (
                previewRenderer(preview)
              ) : preview ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">インポート予定件数</h4>
                      <div className="text-3xl font-bold">{preview.summary.totalRecords}件</div>
                    </div>
                  </div>

                  {(preview.summary.toAdd !== undefined || 
                    preview.summary.toUpdate !== undefined || 
                    preview.summary.toDelete !== undefined) && (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {preview.summary.toAdd !== undefined && (
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-green-600">
                            {preview.summary.toAdd}
                          </p>
                          <p className="text-sm text-muted-foreground">新規追加</p>
                        </div>
                      )}
                      {preview.summary.toUpdate !== undefined && (
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-blue-600">
                            {preview.summary.toUpdate}
                          </p>
                          <p className="text-sm text-muted-foreground">更新</p>
                        </div>
                      )}
                      {preview.summary.toDelete !== undefined && (
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-red-600">
                            {preview.summary.toDelete}
                          </p>
                          <p className="text-sm text-muted-foreground">削除</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    インポート内容を確認して、実行してください。
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  戻る
                </Button>
                <Button onClick={() => handleExecute(false)} disabled={loading || !validation?.isValid}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      インポート実行中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      インポート実行
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: 実行結果 */}
        {currentStep === 5 && result && (
          <Card>
            <CardHeader>
              <CardTitle>インポート結果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultRenderer ? (
                resultRenderer(result)
              ) : (
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
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {error.recordId && `[${error.recordId}] `}{error.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>完了</AlertTitle>
                    <AlertDescription>
                      インポートが完了しました。データを確認してください。
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}