export const SYMBOL = {
    // アプリケーションサービス
    IProjectApplicationService: Symbol.for('IProjectApplicationService'),
    IUserApplicationService: Symbol.for('IUserApplicationService'),
    IWbsApplicationService: Symbol.for('IWbsApplicationService'),
    ITaskApplicationService: Symbol.for('ITaskApplicationService'),
    IAssigneeGanttService: Symbol.for('IAssigneeGanttService'),
    IDashboardApplicationService: Symbol.for('IDashboardApplicationService'),
    IPhaseApplicationService: Symbol.for('IPhaseApplicationService'),
    IMilestoneApplicationService: Symbol.for('IMilestoneApplicationService'),
    IScheduleApplicationService: Symbol.for('IScheduleApplicationService'),

    // リポジトリ
    IProjectRepository: Symbol.for('IProjectRepository'),
    IWbsRepository: Symbol.for('IWbsRepository'),
    IWbsAssigneeRepository: Symbol.for('IWbsAssigneeRepository'),
    IWbsBufferRepository: Symbol.for('IWbsBufferRepository'),
    IPhaseRepository: Symbol.for('IPhaseRepository'),
    ITaskRepository: Symbol.for('ITaskRepository'),
    IDashboardQueryRepository: Symbol.for('IDashboardQueryRepository'),
    IUserRepository: Symbol.for('IUserRepository'),
    IMilestoneRepository: Symbol.for('IMilestoneRepository'),

    // CQRS
    IQueryBus: Symbol.for('IQueryBus'),
    GetDashboardStatsHandler: Symbol.for('GetDashboardStatsHandler'),
    GetWbsSummaryHandler: Symbol.for('GetWbsSummaryHandler'),
    GetWbsTaskSummaryHandler: Symbol.for('GetWbsTaskSummaryHandler'),
    IWbsQueryRepository: Symbol.for('IWbsQueryRepository'),

    // Auth
    IAuthRepository: Symbol.for('IAuthRepository'),
    IAuthApplicationService: Symbol.for('IAuthApplicationService'),

    // Geppo
    IGeppoRepository: Symbol.for('IGeppoRepository'),
    IGeppoApplicationService: Symbol.for('IGeppoApplicationService'),

    // Work Records
    IWorkRecordRepository: Symbol.for('IWorkRecordRepository'),
    IWorkRecordApplicationService: Symbol.for('IWorkRecordApplicationService'),

    // Task Dependencies
    ITaskDependencyRepository: Symbol.for('ITaskDependencyRepository'),
    ITaskDependencyService: Symbol.for('ITaskDependencyService'),

    // Geppo Import
    IGeppoImportApplicationService: Symbol.for('IGeppoImportApplicationService'),
    ProjectMappingService: Symbol.for('ProjectMappingService'),
    UserMappingService: Symbol.for('UserMappingService'),
    TaskMappingService: Symbol.for('TaskMappingService'),

    // WBS Sync
    IExcelWbsRepository: Symbol.for('IExcelWbsRepository'),
    ISyncLogRepository: Symbol.for('ISyncLogRepository'),
    IWbsSyncApplicationService: Symbol.for('IWbsSyncApplicationService'),

    ITaskFactory: Symbol.for('ITaskFactory'),

    // Calendar
    ICompanyHolidayRepository: Symbol.for('ICompanyHolidayRepository'),
    ICompanyHolidayApplicationService: Symbol.for('ICompanyHolidayApplicationService'),
    IUserScheduleRepository: Symbol.for('IUserScheduleRepository'),

    // EVM
    IWbsEvmRepository: Symbol.for('IWbsEvmRepository'),
    IEvmService: Symbol.for('IEvmService'),

    // Import Job
    IImportJobRepository: Symbol.for('IImportJobRepository'),
    IImportJobApplicationService: Symbol.for('IImportJobApplicationService'),

    // Notification
    INotificationService: Symbol.for('INotificationService'),
    INotificationRepository: Symbol.for('INotificationRepository'),
    IPushNotificationService: Symbol.for('IPushNotificationService'),
    NotificationEventDetector: Symbol.for('NotificationEventDetector'),

    // Task Scheduling
    ISchedulingApplicationService: Symbol.for('ISchedulingApplicationService'),
    ISchedulingSettingsRepository: Symbol.for('ISchedulingSettingsRepository'),

    // System Settings
    ISystemSettingsRepository: Symbol.for('ISystemSettingsRepository'),
    ISystemSettingsApplicationService: Symbol.for('ISystemSettingsApplicationService'),

    // Project Settings
    IProjectSettingsRepository: Symbol.for('IProjectSettingsRepository'),
    IProjectSettingsApplicationService: Symbol.for('IProjectSettingsApplicationService'),

    // Forecast
    IForecastApplicationService: Symbol.for('IForecastApplicationService'),

    // WBS Tags
    IWbsTagRepository: Symbol.for('IWbsTagRepository'),
    IWbsTagApplicationService: Symbol.for('IWbsTagApplicationService'),

    // WBS Analytics
    IWbsCrossQueryRepository: Symbol.for('IWbsCrossQueryRepository'),
    IWbsAnalyticsApplicationService: Symbol.for('IWbsAnalyticsApplicationService'),

    // Cross WBS Workload
    ICrossWbsWorkloadService: Symbol.for('ICrossWbsWorkloadService'),
    ITargetWbsQueryRepository: Symbol.for('ITargetWbsQueryRepository'),


    // Infrastructure
    PrismaClient: Symbol.for('PrismaClient'),
}
