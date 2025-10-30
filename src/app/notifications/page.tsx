import { Suspense } from 'react';
import { NotificationPageClient } from './notification-page-client';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">通知</h1>
          <p className="text-gray-600">
            プロジェクト管理に関する重要な通知を確認できます。
          </p>
        </div>

        <Suspense fallback={<NotificationPageSkeleton />}>
          <NotificationPageClient />
        </Suspense>
      </div>
    </div>
  );
}

function NotificationPageSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}