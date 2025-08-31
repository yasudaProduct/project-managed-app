"use client";

import React, { useState } from "react";
import { Settings, RefreshCw, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationList } from "@/components/notification/NotificationList";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function NotificationPageClient() {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("unread");
  const [page, setPage] = useState(1);

  const {
    notifications,
    unreadCount,
    totalPages,
    hasNext,
    hasPrev,
    isLoading,
    error,
    markAllNotificationsAsRead,
    refresh,
    markAllAsReadState,
  } = useNotifications({
    page,
    limit: 20,
    unreadOnly: activeTab === "unread",
    enableRealtime: true,
    autoRefresh: false, // 手動更新のみ
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "all" | "unread");
    setPage(1); // ページをリセット
  };

  const handleRefresh = () => {
    refresh();
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          通知の読み込みに失敗しました: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {/* <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? "リアルタイム接続中" : "接続中..."}
            </span> */}
          </div>

          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount}件未読</Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            更新
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadState?.success === false}
            >
              <CheckCheck size={16} className="mr-2" />
              全て既読
            </Button>
          )}

          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/notifications">
              <Settings size={16} className="mr-2" />
              設定
            </Link>
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <Card>
        <CardHeader>
          <CardTitle>通知一覧</CardTitle>
          <CardDescription>
            プロジェクト管理に関する重要な通知を確認できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="unread">
                未読 {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="all">全て</TabsTrigger>
            </TabsList>

            <TabsContent value="unread">
              {unreadCount === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📭</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    未読の通知はありません
                  </h3>
                  <p className="text-gray-600">
                    新しい通知があると、ここに表示されます。
                  </p>
                </div>
              ) : (
                <>
                  <NotificationList
                    notifications={notifications}
                    isLoading={isLoading}
                    showUnreadOnly={true}
                  />

                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    hasNext={hasNext}
                    hasPrev={hasPrev}
                    onPageChange={setPage}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="all">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📪</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    通知がありません
                  </h3>
                  <p className="text-gray-600">
                    プロジェクトの活動に関する通知がここに表示されます。
                  </p>
                </div>
              ) : (
                <>
                  <NotificationList
                    notifications={notifications}
                    isLoading={isLoading}
                    showUnreadOnly={false}
                  />

                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    hasNext={hasNext}
                    hasPrev={hasPrev}
                    onPageChange={setPage}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 状態メッセージ */}
      {markAllAsReadState?.success && (
        <Alert>
          <AlertDescription>すべての通知を既読にしました。</AlertDescription>
        </Alert>
      )}

      {markAllAsReadState?.error && (
        <Alert variant="destructive">
          <AlertDescription>{markAllAsReadState.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ページネーションコンポーネント
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev}
      >
        前へ
      </Button>

      <span className="px-3 py-1 text-sm text-gray-600">
        {currentPage} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
      >
        次へ
      </Button>
    </div>
  );
}
