'use client';

import React from 'react';
import { NotificationItem } from './NotificationItem';
import { NotificationData } from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationListProps {
  notifications: NotificationData[];
  isLoading?: boolean;
  showUnreadOnly?: boolean;
  onNotificationClick?: (notification: NotificationData) => void;
  className?: string;
}

export function NotificationList({
  notifications,
  isLoading = false,
  showUnreadOnly = false,
  onNotificationClick,
  className = '',
}: NotificationListProps) {
  
  // フィルタリング
  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  // 並び替え（優先度 > 作成日時）
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // 未読を優先
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }
    
    // 優先度でソート
    const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    // 作成日時でソート（新しい順）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (isLoading && notifications.length === 0) {
    return (
      <div className={`space-y-3 p-3 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <NotificationSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (sortedNotifications.length === 0) {
    return null; // 親コンポーネントで空状態を表示
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {sortedNotifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClick={() => onNotificationClick?.(notification)}
        />
      ))}
      
      {isLoading && (
        <div className="space-y-3 p-3">
          <NotificationSkeleton />
        </div>
      )}
    </div>
  );
}

// スケルトンローダー
function NotificationSkeleton() {
  return (
    <div className="flex items-start space-x-3 p-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="flex space-x-1">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  );
}