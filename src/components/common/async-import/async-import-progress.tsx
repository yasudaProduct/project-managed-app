'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react'
import { ImportJobStatus } from '@prisma/client'

interface ImportJobInfo {
  id: string
  type: string
  status: ImportJobStatus
  progress: number
  totalRecords: number
  processedRecords: number
  successCount: number
  errorCount: number
  startedAt?: string
  completedAt?: string
  errorDetails?: Record<string, unknown>
  result?: Record<string, unknown>
}

interface ImportProgressMessage {
  message: string
  level: 'info' | 'warning' | 'error'
  detail?: Record<string, unknown>
  recordedAt: string
}

interface AsyncImportProgressProps {
  jobId: string
  onComplete?: (job: ImportJobInfo) => void
  onCancel?: () => void
  autoRefresh?: boolean
  showLogs?: boolean
}

export function AsyncImportProgress({ 
  jobId, 
  onComplete, 
  onCancel, 
  autoRefresh = true,
  showLogs = true 
}: AsyncImportProgressProps) {
  const [job, setJob] = useState<ImportJobInfo | null>(null)
  const [logs, setLogs] = useState<ImportProgressMessage[]>([])
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId || !autoRefresh) return

    // Server-Sent Events接続
    const eventSource = new EventSource(`/api/import-jobs/${jobId}/stream`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'job_update') {
          setJob(data.job)
          setIsLoading(false)
          
          // 完了時のコールバック
          if (data.job.status !== 'RUNNING' && data.job.status !== 'PENDING') {
            onComplete?.(data.job)
          }
        } else if (data.type === 'progress_update') {
          setLogs(prev => [data.progress, ...prev].slice(0, 100)) // 最新100件まで保持
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err)
      }
    }

    eventSource.onerror = (event) => {
      console.error('SSE error:', event)
      setError('リアルタイム更新との接続が失敗しました')
      eventSource.close()
      
      // フォールバック：ポーリング
      const pollJob = async () => {
        try {
          const response = await fetch(`/api/import-jobs/${jobId}`)
          if (response.ok) {
            const jobData = await response.json()
            setJob(jobData)
            setIsLoading(false)
            
            if (jobData.status !== 'RUNNING' && jobData.status !== 'PENDING') {
              onComplete?.(jobData)
            }
          }
        } catch (err) {
          console.error('Failed to poll job status:', err)
        }
      }

      const interval = setInterval(pollJob, 2000)
      return () => clearInterval(interval)
    }

    return () => {
      eventSource.close()
    }
  }, [jobId, autoRefresh, onComplete])

  const handleCancel = async () => {
    try {
      await fetch(`/api/import-jobs/${jobId}/cancel`, { method: 'POST' })
      onCancel?.()
    } catch (err) {
      console.error('Failed to cancel job:', err)
    }
  }

  const getStatusIcon = (status: ImportJobStatus) => {
    switch (status) {
      case 'PENDING':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: ImportJobStatus) => {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'RUNNING':
        return 'default'
      case 'COMPLETED':
        return 'secondary'
      case 'FAILED':
        return 'destructive'
      case 'CANCELLED':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getStatusText = (status: ImportJobStatus) => {
    switch (status) {
      case 'PENDING':
        return '実行待ち'
      case 'RUNNING':
        return '実行中'
      case 'COMPLETED':
        return '完了'
      case 'FAILED':
        return '失敗'
      case 'CANCELLED':
        return 'キャンセル'
      default:
        return status
    }
  }

  if (isLoading && !job) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>インポート状況を読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            インポートジョブが見つかりません
          </div>
        </CardContent>
      </Card>
    )
  }

  const visibleLogs = showAllLogs ? logs : logs.slice(0, 5)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(job.status)}
              <CardTitle className="text-lg">
                {job.type === 'WBS' ? 'WBS' : 'Geppo'}インポート
              </CardTitle>
              <Badge variant={getStatusColor(job.status)}>
                {getStatusText(job.status)}
              </Badge>
            </div>
            {(job.status === 'RUNNING' || job.status === 'PENDING') && (
              <Button variant="outline" size="sm" onClick={handleCancel}>
                キャンセル
              </Button>
            )}
          </div>
          <CardDescription>
            ジョブID: {job.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.status === 'RUNNING' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>進捗</span>
                <span>{job.progress}% ({job.processedRecords}/{job.totalRecords})</span>
              </div>
              <Progress value={job.progress} className="h-2" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">成功:</span>
              <span className="ml-2 font-medium text-green-600">{job.successCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">エラー:</span>
              <span className="ml-2 font-medium text-red-600">{job.errorCount}</span>
            </div>
          </div>

          {job.startedAt && (
            <div className="text-sm text-muted-foreground">
              開始: {new Date(job.startedAt).toLocaleString('ja-JP')}
            </div>
          )}

          {job.completedAt && (
            <div className="text-sm text-muted-foreground">
              完了: {new Date(job.completedAt).toLocaleString('ja-JP')}
            </div>
          )}

          {job.status === 'FAILED' && job.errorDetails && (
            <div className="p-3 bg-red-50 rounded-md">
              <p className="text-sm font-medium text-red-800">エラー詳細</p>
              <p className="text-sm text-red-700 mt-1">
                {typeof job.errorDetails === 'string' 
                  ? job.errorDetails 
                  : (job.errorDetails as { message?: string })?.message || 'エラーが発生しました'
                }
              </p>
            </div>
          )}

          {job.status === 'COMPLETED' && job.result && (
            <div className="p-3 bg-green-50 rounded-md">
              <p className="text-sm font-medium text-green-800">結果</p>
              <div className="text-sm text-green-700 mt-1">
                <div>作成: {(job.result as { createdCount?: number })?.createdCount || 0}件</div>
                <div>更新: {(job.result as { updatedCount?: number })?.updatedCount || 0}件</div>
                <div>削除: {(job.result as { deletedCount?: number })?.deletedCount || 0}件</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showLogs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">実行ログ</CardTitle>
              {logs.length > 5 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAllLogs(!showAllLogs)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {showAllLogs ? '簡潔表示' : `すべて表示 (${logs.length})`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {visibleLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`text-sm p-2 rounded ${
                    log.level === 'error' ? 'bg-red-50 text-red-800' :
                    log.level === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                    'bg-gray-50 text-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="flex-1">{log.message}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(log.recordedAt).toLocaleTimeString('ja-JP')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-red-600">{error}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}