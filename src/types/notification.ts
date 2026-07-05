export enum NotificationType {
    TASK_DEADLINE_WARNING = 'TASK_DEADLINE_WARNING',     // タスク期限警告
    TASK_DEADLINE_OVERDUE = 'TASK_DEADLINE_OVERDUE',     // タスク期限超過
    TASK_MANHOUR_WARNING = 'TASK_MANHOUR_WARNING',       // 工数警告
    TASK_MANHOUR_EXCEEDED = 'TASK_MANHOUR_EXCEEDED',     // 工数超過
    TASK_ASSIGNED = 'TASK_ASSIGNED',                     // タスクアサイン
    TASK_UPDATED = 'TASK_UPDATED',                       // タスク更新
    SCHEDULE_DELAY = 'SCHEDULE_DELAY',                   // スケジュール遅延
    PROJECT_STATUS_CHANGED = 'PROJECT_STATUS_CHANGED',   // プロジェクトステータス変更
    IMPORT_JOB_COMPLETED = 'IMPORT_JOB_COMPLETED',       // インポートジョブ完了
    IMPORT_JOB_FAILED = 'IMPORT_JOB_FAILED',             // インポートジョブ失敗
}

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const NOTIFICATION_PRIORITIES: NotificationPriority[] = [
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT',
];

export type NotificationChannel = 'PUSH' | 'IN_APP' | 'EMAIL';

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
    'PUSH',
    'IN_APP',
    'EMAIL',
];

export const getNotificationTypeDisplayName = (type: NotificationType): string => {
    switch (type) {
        case NotificationType.TASK_DEADLINE_WARNING:
            return 'タスク期限警告';
        case NotificationType.TASK_DEADLINE_OVERDUE:
            return 'タスク期限超過';
        case NotificationType.TASK_MANHOUR_WARNING:
            return '工数警告';
        case NotificationType.TASK_MANHOUR_EXCEEDED:
            return '工数超過';
        case NotificationType.TASK_ASSIGNED:
            return 'タスク割り当て';
        case NotificationType.TASK_UPDATED:
            return 'タスク更新';
        case NotificationType.SCHEDULE_DELAY:
            return 'スケジュール遅延';
        case NotificationType.PROJECT_STATUS_CHANGED:
            return 'プロジェクトステータス変更';
        case NotificationType.IMPORT_JOB_COMPLETED:
            return 'インポートジョブ完了';
        case NotificationType.IMPORT_JOB_FAILED:
            return 'インポートジョブ失敗';
        default:
            return '不明な通知';
    }
}

export const getNotificationTypeIcon = (type: NotificationType): string => {
    switch (type) {
        case NotificationType.TASK_DEADLINE_WARNING:
        case NotificationType.TASK_DEADLINE_OVERDUE:
            return '⏰';
        case NotificationType.TASK_MANHOUR_WARNING:
        case NotificationType.TASK_MANHOUR_EXCEEDED:
            return '📊';
        case NotificationType.TASK_ASSIGNED:
        case NotificationType.TASK_UPDATED:
            return '📋';
        case NotificationType.SCHEDULE_DELAY:
            return '⚠️';
        case NotificationType.PROJECT_STATUS_CHANGED:
            return '🚀';
        case NotificationType.IMPORT_JOB_COMPLETED:
            return '✅';
        case NotificationType.IMPORT_JOB_FAILED:
            return '❌';
        default:
            return '📢';
    }
}