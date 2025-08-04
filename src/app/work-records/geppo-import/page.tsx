'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  validateGeppoImport, 
  previewGeppoImport, 
  executeGeppoImport,
  getAvailableProjectsForImport
} from '@/app/actions/geppo-import'
import { GeppoImportValidation, GeppoImportPreview, GeppoImportResult, ProjectImportOption } from '@/domains/geppo-import/geppo-import-result'

export default function GeppoImportPage() {
  const [targetMonth, setTargetMonth] = useState('')
  const [updateMode, setUpdateMode] = useState<'merge' | 'replace'>('merge')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [availableProjects, setAvailableProjects] = useState<ProjectImportOption[]>([])
  const [validation, setValidation] = useState<GeppoImportValidation | null>(null)
  const [preview, setPreview] = useState<GeppoImportPreview | null>(null)
  const [result, setResult] = useState<GeppoImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState('setup')

  const handleLoadProjects = async () => {
    if (!targetMonth) {
      alert('対象月を入力してください')
      return
    }

    setLoading(true)
    try {
      const projects = await getAvailableProjectsForImport(targetMonth)
      setAvailableProjects(projects)
      setCurrentTab('projects')
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
      const validationResult = await validateGeppoImport({
        targetMonth,
        updateMode,
        targetProjectNames: selectedProjects.length > 0 ? selectedProjects : undefined,
        dryRun: false
      })
      setValidation(validationResult)
      setCurrentTab('validation')
    } catch (error) {
      console.error('Failed to validate import:', error)
      alert('バリデーションに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    setLoading(true)
    try {
      const previewResult = await previewGeppoImport({
        targetMonth,
        updateMode,
        targetProjectNames: selectedProjects.length > 0 ? selectedProjects : undefined,
        dryRun: false
      })
      setPreview(previewResult)
      setCurrentTab('preview')
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
      const importResult = await executeGeppoImport({
        targetMonth,
        updateMode,
        targetProjectNames: selectedProjects.length > 0 ? selectedProjects : undefined,
        dryRun
      })
      setResult(importResult)
      setCurrentTab('result')
    } catch (error) {
      console.error('Failed to execute import:', error)
      alert('インポート実行に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectToggle = (projectName: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectName) 
        ? prev.filter(p => p !== projectName)
        : [...prev, projectName]
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Geppoインポート</h1>
        <p className="text-muted-foreground">月報データをワークレコードにインポートします</p>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup">設定</TabsTrigger>
          <TabsTrigger value="projects" disabled={availableProjects.length === 0}>プロジェクト選択</TabsTrigger>
          <TabsTrigger value="validation" disabled={!validation}>バリデーション</TabsTrigger>
          <TabsTrigger value="preview" disabled={!preview}>プレビュー</TabsTrigger>
          <TabsTrigger value="result" disabled={!result}>実行結果</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本設定</CardTitle>
              <CardDescription>インポートの基本設定を行います</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetMonth">対象月 (YYYY-MM)</Label>
                <Input
                  id="targetMonth"
                  placeholder="2024-07"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>更新モード</Label>
                <RadioGroup value={updateMode} onValueChange={(value) => setUpdateMode(value as 'merge' | 'replace')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge">マージ（差分更新）</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace">置換（既存データ削除後作成）</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={handleLoadProjects} disabled={loading || !targetMonth}>
                {loading ? 'プロジェクト取得中...' : 'プロジェクト一覧を取得'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>インポート対象プロジェクト選択</CardTitle>
              <CardDescription>
                インポートするプロジェクトを選択してください（未選択の場合は全プロジェクト）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {availableProjects.length}件のプロジェクトが利用可能
                  </span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedProjects([])}>
                      すべて解除
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedProjects(availableProjects.map(p => p.projectName))}>
                      すべて選択
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {availableProjects.map((project) => (
                    <div key={project.projectId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedProjects.includes(project.projectName)}
                          onCheckedChange={() => handleProjectToggle(project.projectName)}
                        />
                        <div>
                          <div className="font-medium">{project.projectName}</div>
                          <div className="text-sm text-muted-foreground">
                            Geppo IDs: {project.geppoProjectIds.join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{project.recordCount}件</Badge>
                        <Badge variant="outline">{project.userCount}ユーザー</Badge>
                        <Badge variant={project.mappingStatus === 'mapped' ? 'default' : 'destructive'}>
                          {project.mappingStatus === 'mapped' ? 'マップ済み' : '未マップ'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleValidate} disabled={loading}>
                    {loading ? 'バリデーション中...' : 'バリデーション実行'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          {validation && (
            <>
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
                  {validation.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-destructive">エラー</h4>
                      {validation.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
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
                          <AlertDescription>{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">ユーザーマッピング</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{Math.round(validation.userMapping.mappingRate * 100)}%</div>
                        <div className="text-sm text-muted-foreground">
                          {validation.userMapping.mappedUsers}/{validation.userMapping.totalUsers} ユーザー
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">プロジェクトマッピング</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{Math.round(validation.projectMapping.mappingRate * 100)}%</div>
                        <div className="text-sm text-muted-foreground">
                          {validation.projectMapping.mappedProjects}/{validation.projectMapping.totalProjects} プロジェクト
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">タスクマッピング</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{Math.round(validation.taskMapping.mappingRate * 100)}%</div>
                        <div className="text-sm text-muted-foreground">
                          {validation.taskMapping.mappedTasks}/{validation.taskMapping.totalTasks} タスク
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handlePreview} disabled={loading}>
                      {loading ? 'プレビュー作成中...' : 'プレビュー表示'}
                    </Button>
                    <Button onClick={() => handleExecute(true)} disabled={loading}>
                      {loading ? 'ドライラン実行中...' : 'ドライラン実行'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle>インポートプレビュー</CardTitle>
                <CardDescription>サンプルデータと統計情報</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">作成予定ワークレコード数</h4>
                    <div className="text-3xl font-bold">{preview.summary.totalWorkRecords}件</div>
                  </div>
                </div>

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
                        {preview.sampleRecords.map((record, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{record.memberId}</td>
                            <td className="p-2">{record.date.toLocaleDateString()}</td>
                            <td className="p-2">{record.hoursWorked}時間</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button onClick={() => handleExecute(false)} disabled={loading || !validation?.isValid}>
                    {loading ? 'インポート実行中...' : 'インポート実行'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="result" className="space-y-6">
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>インポート結果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                          {error.memberId} - {error.date?.toLocaleDateString()}: {error.message}
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}