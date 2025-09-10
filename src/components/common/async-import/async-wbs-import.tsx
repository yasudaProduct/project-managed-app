'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AsyncImportProgress } from './async-import-progress'

interface AsyncWbsImportProps {
  userId: string
  wbsId: number
  projectName: string
  lastSync?: {
    syncedAt: string
    recordCount: number
    syncStatus: string
  }
}

export function AsyncWbsImport({ userId, wbsId, projectName, lastSync }: AsyncWbsImportProps) {
  const [syncMode, setSyncMode] = useState<'replace'>('replace')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/import-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'WBS',
          createdBy: userId,
          wbsId,
          options: {
            mode: syncMode,
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
      console.error('Failed to start WBS import:', error)
      alert('WBS同期開始に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setJobId(null)
    setSyncMode('replace')
  }

  if (jobId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">WBS同期実行中</h2>
          <Button variant="outline" onClick={handleReset}>
            新規同期
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
        <CardTitle>Excel → WBS 同期</CardTitle>
        <CardDescription>
          プロジェクト: {projectName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            ExcelファイルからWBSデータを一方向同期します。
            Excel側のデータがマスターとなり、アプリケーション側のデータは上書きされます。
          </AlertDescription>
        </Alert>

        {lastSync && lastSync.syncStatus === 'SUCCESS' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">最終同期</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(lastSync.syncedAt).toLocaleString("ja-JP")} - {lastSync.recordCount}件
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="syncMode">同期モード</Label>
          <Select value={syncMode} onValueChange={(value: 'replace') => setSyncMode(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">置換（既存データを削除してから同期）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? '同期を開始中...' : '同期開始'}
        </Button>
      </CardContent>
    </Card>
  )
}