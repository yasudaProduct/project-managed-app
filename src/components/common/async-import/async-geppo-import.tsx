'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AsyncImportProgress } from './async-import-progress'

interface AsyncGeppoImportProps {
  userId: string
  availableProjects: Array<{ id: string; name: string }>
}

export function AsyncGeppoImport({ userId, availableProjects }: AsyncGeppoImportProps) {
  const [targetMonth, setTargetMonth] = useState('')
  const [targetProjectIds, setTargetProjectIds] = useState<string[]>([])
  const [updateMode, setUpdateMode] = useState<'merge' | 'replace'>('merge')
  const [dryRun, setDryRun] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!targetMonth) {
      alert('対象月を選択してください')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/import-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'GEPPO',
          createdBy: userId,
          targetMonth,
          targetProjectIds,
          options: {
            updateMode,
            dryRun,
          },
        }),
      })

      if (response.ok) {
        const job = await response.json()
        setJobId(job.id)
      } else {
        const error = await response.json()
        alert(`エラー: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to start import:', error)
      alert('インポート開始に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProjectChange = (projectId: string, checked: boolean) => {
    if (checked) {
      setTargetProjectIds(prev => [...prev, projectId])
    } else {
      setTargetProjectIds(prev => prev.filter(id => id !== projectId))
    }
  }

  const handleReset = () => {
    setJobId(null)
    setTargetMonth('')
    setTargetProjectIds([])
    setUpdateMode('merge')
    setDryRun(false)
  }

  if (jobId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Geppoインポート実行中</h2>
          <Button variant="outline" onClick={handleReset}>
            新規インポート
          </Button>
        </div>
        <AsyncImportProgress 
          jobId={jobId} 
          onComplete={() => {
            // 完了後の処理
          }}
        />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geppoデータインポート</CardTitle>
        <CardDescription>
          MySQLのgeppoテーブルから作業記録データをインポートします
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="targetMonth">対象月</Label>
          <Input
            id="targetMonth"
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>対象プロジェクト（未選択の場合は全プロジェクト）</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
            {availableProjects.map((project) => (
              <div key={project.id} className="flex items-center space-x-2">
                <Checkbox
                  id={project.id}
                  checked={targetProjectIds.includes(project.id)}
                  onCheckedChange={(checked) => handleProjectChange(project.id, !!checked)}
                />
                <Label htmlFor={project.id} className="text-sm">
                  {project.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="updateMode">更新モード</Label>
          <Select value={updateMode} onValueChange={(value: 'merge' | 'replace') => setUpdateMode(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merge">マージ（差分更新）</SelectItem>
              <SelectItem value="replace">置換（全削除後に作成）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="dryRun"
            checked={dryRun}
            onCheckedChange={(checked) => setDryRun(checked === true)}
          />
          <Label htmlFor="dryRun">
            ドライラン（データを更新せずに実行内容のみ確認）
          </Label>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !targetMonth}
          className="w-full"
        >
          {isSubmitting ? 'インポートを開始中...' : 'インポート開始'}
        </Button>
      </CardContent>
    </Card>
  )
}