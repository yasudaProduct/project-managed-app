'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Eye, Trash2 } from 'lucide-react'
import { ImportJobStatus } from '@prisma/client'
import { AsyncImportProgress } from './async-import-progress'

interface ImportJob {
  id: string
  type: 'WBS' | 'GEPPO'
  status: ImportJobStatus
  progress: number
  totalRecords: number
  processedRecords: number
  successCount: number
  errorCount: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  targetMonth?: string
  wbsId?: number
}

interface ImportJobListProps {
  userId: string
  refreshInterval?: number
}

export function ImportJobList({ userId, refreshInterval = 30000 }: ImportJobListProps) {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch(`/api/import-jobs?userId=${userId}`)
      if (response.ok) {
        const jobData = await response.json()
        setJobs(jobData)
      }
    } catch (error) {
      console.error('Failed to fetch import jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchJobs()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchJobs, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [userId, refreshInterval, fetchJobs])

  const handleDeleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/import-jobs/${jobId}`, { 
        method: 'DELETE' 
      })
      if (response.ok) {
        setJobs(jobs.filter(job => job.id !== jobId))
        if (selectedJobId === jobId) {
          setSelectedJobId(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete job:', error)
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
        return '待機中'
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

  const runningJobs = jobs.filter(job => job.status === 'RUNNING')
  const recentJobs = jobs.filter(job => job.status !== 'RUNNING').slice(0, 10)

  if (selectedJobId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedJobId(null)}
          >
            ← 一覧に戻る
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
        </div>
        <AsyncImportProgress
          jobId={selectedJobId}
          onComplete={() => fetchJobs()}
          onCancel={() => setSelectedJobId(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">インポートジョブ管理</h2>
        <Button variant="outline" size="sm" onClick={fetchJobs} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* 実行中のジョブ */}
      {runningJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">実行中のジョブ ({runningJobs.length})</CardTitle>
            <CardDescription>
              現在進行中のインポート処理です
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {runningJobs.map((job) => (
                <div key={job.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusColor(job.status)}>
                        {job.type} - {getStatusText(job.status)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {job.progress}% ({job.processedRecords}/{job.totalRecords})
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      詳細
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    開始: {job.startedAt ? new Date(job.startedAt).toLocaleString('ja-JP') : '-'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最近のジョブ履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近のジョブ履歴</CardTitle>
          <CardDescription>
            過去に実行されたインポートジョブの履歴です
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              実行履歴がありません
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {recentJobs.map((job, index) => (
                  <div key={job.id}>
                    <div className="flex items-center justify-between p-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(job.status)}>
                            {job.type}
                          </Badge>
                          <Badge variant="outline">
                            {getStatusText(job.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {job.targetMonth && `(${job.targetMonth})`}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          作成: {new Date(job.createdAt).toLocaleString('ja-JP')}
                        </div>
                        {job.completedAt && (
                          <div className="text-sm text-muted-foreground">
                            完了: {new Date(job.completedAt).toLocaleString('ja-JP')}
                          </div>
                        )}
                        <div className="text-sm">
                          成功: <span className="text-green-600">{job.successCount}</span> / 
                          エラー: <span className="text-red-600">{job.errorCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          詳細
                        </Button>
                        {job.status !== 'RUNNING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {index < recentJobs.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}