export const SYMBOL = {
    // アプリケーションサービス
    IProjectApplicationService: Symbol.for('IProjectApplicationService'),
    IUserApplicationService: Symbol.for('IUserApplicationService'),
    IWbsApplicationService: Symbol.for('IWbsApplicationService'),
    ITaskApplicationService: Symbol.for('ITaskApplicationService'),
    IScheduleGenerateService: Symbol.for('IScheduleGenerateService'),
    IAssigneeGanttService: Symbol.for('IAssigneeGanttService'),
    IDashboardApplicationService: Symbol.for('IDashboardApplicationService'),
    IPhaseApplicationService: Symbol.for('IPhaseApplicationService'),
    IMilestoneApplicationService: Symbol.for('IMilestoneApplicationService'),

    // ドメインサービス
    GetOperationPossible: Symbol.for('GetOperationPossible'),
    ScheduleGenerate: Symbol.for('ScheduleGenerate'),

    // リポジトリ
    IProjectRepository: Symbol.for('IProjectRepository'),
    IWbsRepository: Symbol.for('IWbsRepository'),
    IWbsAssigneeRepository: Symbol.for('IWbsAssigneeRepository'),
    IPhaseRepository: Symbol.for('IPhaseRepository'),
    ITaskRepository: Symbol.for('ITaskRepository'),
    IDashboardQueryRepository: Symbol.for('IDashboardQueryRepository'),
    IUserRepository: Symbol.for('IUserRepository'),
    IMilestoneRepository: Symbol.for('IMilestoneRepository'),

    // CQRS
    IQueryBus: Symbol.for('IQueryBus'),
    GetDashboardStatsHandler: Symbol.for('GetDashboardStatsHandler'),
    GetWbsSummaryHandler: Symbol.for('GetWbsSummaryHandler'),
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
    IWbsSyncService: Symbol.for('IWbsSyncService'),
    IExcelWbsRepository: Symbol.for('IExcelWbsRepository'),
    ISyncLogRepository: Symbol.for('ISyncLogRepository'),
    IWbsSyncApplicationService: Symbol.for('IWbsSyncApplicationService'),

    ITaskFactory: Symbol.for('ITaskFactory'),

    // Calendar
    ICompanyHolidayRepository: Symbol.for('ICompanyHolidayRepository'),
    IUserScheduleRepository: Symbol.for('IUserScheduleRepository'),

    // EVM
    IEvmRepository: Symbol.for('IEvmRepository'),
    IEvmApplicationService: Symbol.for('IEvmApplicationService'),
    IWbsEvmRepository: Symbol.for('IWbsEvmRepository'),
    EvmService: Symbol.for('EvmService'),

    // Import Job
    IImportJobRepository: Symbol.for('IImportJobRepository'),
    IImportJobApplicationService: Symbol.for('IImportJobApplicationService'),

    // Notification
    INotificationService: Symbol.for('INotificationService'),
    INotificationRepository: Symbol.for('INotificationRepository'),

    // Task Scheduling
    ITaskSchedulingApplicationService: Symbol.for('ITaskSchedulingApplicationService'),
    TaskSchedulingService: Symbol.for('TaskSchedulingService'),

    // System Settings
    ISystemSettingsRepository: Symbol.for('ISystemSettingsRepository'),
    ISystemSettingsApplicationService: Symbol.for('ISystemSettingsApplicationService'),

    // WBS Tags
    IWbsTagRepository: Symbol.for('IWbsTagRepository'),
    IWbsTagApplicationService: Symbol.for('IWbsTagApplicationService'),

    // WBS Analytics
    IWbsCrossQueryRepository: Symbol.for('IWbsCrossQueryRepository'),
    WbsAnalyticsHandler: Symbol.for('WbsAnalyticsHandler'),

    // Infrastructure
    PrismaClient: Symbol.for('PrismaClient'),
}
