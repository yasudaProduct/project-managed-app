"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Check, X, ExternalLink } from "lucide-react";
import { NotificationData, useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: NotificationData;
  onClick?: () => void;
  showActions?: boolean;
  className?: string;
}

export function NotificationItem({
  notification,
  onClick,
  showActions = true,
  className = "",
}: NotificationItemProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    markSingleAsRead,
    deleteNotificationById,
    getPriorityIcon,
    getTypeIcon,
  } = useNotifications();

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (notification.isRead || isProcessing) return;

    setIsProcessing(true);
    try {
      markSingleAsRead(notification.id.toString());
    } catch (error) {
      console.error("Failed to mark as read:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isProcessing) return;

    setIsProcessing(true);
    try {
      deleteNotificationById(notification.id.toString());
    } catch (error) {
      console.error("Failed to delete notification:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    // 未読の場合は自動で既読にする
    if (!notification.isRead) {
      markSingleAsRead(notification.id.toString());
    }
    onClick?.();
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case "URGENT":
        return "border-red-500 bg-red-50";
      case "HIGH":
        return "border-orange-500 bg-orange-50";
      case "MEDIUM":
        return "border-blue-500 bg-blue-50";
      case "LOW":
        return "border-gray-300 bg-gray-50";
      default:
        return "border-gray-300 bg-white";
    }
  };

  const getNotificationIcon = () => {
    const typeIcon = getTypeIcon(notification.type);
    const priorityIcon = getPriorityIcon(notification.priority);

    // 緊急度が高い場合は優先度アイコンを表示
    if (
      notification.priority === "URGENT" ||
      notification.priority === "HIGH"
    ) {
      return priorityIcon;
    }

    return typeIcon;
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ja,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return "時間不明";
    }
  };

  const notificationContent = (
    <div
      className={cn(
        "flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50",
        getPriorityColor(),
        !notification.isRead && "shadow-sm",
        notification.isRead && "opacity-75",
        isProcessing && "opacity-50 pointer-events-none",
        className
      )}
      onClick={handleClick}
    >
      {/* アイコン */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 flex items-center justify-center text-lg">
          {getNotificationIcon()}
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 mx-auto" />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <h4
            className={cn(
              "text-sm font-medium text-gray-900 line-clamp-2",
              notification.isRead && "text-gray-600"
            )}
          >
            {notification.title}
          </h4>

          {showActions && (
            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isProcessing}
                  className="h-6 w-6 p-0"
                  title="既読にする"
                >
                  <Check size={12} />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isProcessing}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                title="削除"
              >
                <X size={12} />
              </Button>

              {notification.actionUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                  title="詳細を見る"
                >
                  <Link
                    href={notification.actionUrl}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        <p
          className={cn(
            "text-sm text-gray-600 mt-1 line-clamp-2",
            notification.isRead && "text-gray-500"
          )}
        >
          {notification.message}
        </p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {formatTime(notification.createdAt)}
          </span>

          {notification.type && (
            <span className="text-xs text-gray-400 font-mono">
              {getTypeDisplayName(notification.type)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // アクションURLがある場合はリンクでラップ
  if (notification.actionUrl && !showActions) {
    return (
      <Link href={notification.actionUrl} className="block">
        {notificationContent}
      </Link>
    );
  }

  return notificationContent;
}

// 通知タイプの表示名
function getTypeDisplayName(type: string): string {
  switch (type) {
    case "TASK_DEADLINE_WARNING":
      return "タスク期限";
    case "TASK_DEADLINE_OVERDUE":
      return "タスク超過";
    case "TASK_MANHOUR_WARNING":
      return "工数警告";
    case "TASK_MANHOUR_EXCEEDED":
      return "工数超過";
    case "TASK_ASSIGNED":
      return "タスク割当";
    case "TASK_UPDATED":
      return "タスク更新";
    case "SCHEDULE_DELAY":
      return "スケジュール遅延";
    case "PROJECT_STATUS_CHANGED":
      return "プロジェクト";
    default:
      return type;
  }
}
