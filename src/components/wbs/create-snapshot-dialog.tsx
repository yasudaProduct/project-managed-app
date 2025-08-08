'use client';

/**
 * 手動スナップショット作成ダイアログコンポーネント
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Camera, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSnapshot: (snapshotName?: string) => void;
  isLoading?: boolean;
}

export function CreateSnapshotDialog({
  open,
  onOpenChange,
  onCreateSnapshot,
  isLoading = false,
}: CreateSnapshotDialogProps) {
  const [snapshotName, setSnapshotName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // フォームのリセット
  const resetForm = () => {
    setSnapshotName('');
    setDescription('');
    setError('');
  };

  // ダイアログが閉じられた時の処理
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // スナップショット作成の処理
  const handleCreateSnapshot = () => {
    setError('');

    try {
      // スナップショット名が空の場合はデフォルト名を生成
      const finalSnapshotName = snapshotName.trim() || undefined;
      
      onCreateSnapshot(finalSnapshotName);
      
      // 成功時はダイアログを閉じる
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スナップショットの作成に失敗しました');
    }
  };

  // 現在の日時を使用したデフォルト名を生成
  const generateDefaultName = () => {
    const now = new Date();
    const timestamp = now.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    setSnapshotName(`手動スナップショット_${timestamp}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>スナップショット作成</span>
          </DialogTitle>
          <DialogDescription>
            現在の進捗状況を手動でスナップショットとして保存します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* エラー表示 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* スナップショット名入力 */}
          <div className="space-y-2">
            <Label htmlFor="snapshotName">スナップショット名（任意）</Label>
            <div className="flex space-x-2">
              <Input
                id="snapshotName"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="例: 第1回レビュー前"
                maxLength={100}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateDefaultName}
                disabled={isLoading}
              >
                自動
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              空の場合は自動的に日時が設定されます
            </p>
          </div>

          {/* 説明入力（将来の拡張用） */}
          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このスナップショットの説明や背景を入力してください"
              rows={3}
              maxLength={500}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500文字
            </p>
          </div>

          {/* 注意事項 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              スナップショットは現在のタスク状況、進捗率、工数情報を記録します。
              過去のデータは変更されません。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                スナップショット作成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}