export const SYMBOL = {
    // アプリケーションサービス
    IProjectApplicationService: Symbol.for('IProjectApplicationService'),
    IWbsApplicationService: Symbol.for('IWbsApplicationService'),
    ITaskApplicationService: Symbol.for('ITaskApplicationService'),
    IScheduleGenerateService: Symbol.for('IScheduleGenerateService'),
    IDashboardApplicationService: Symbol.for('IDashboardApplicationService'),
    IPhaseApplicationService: Symbol.for('IPhaseApplicationService'),

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

    // Geppo Import
    IGeppoImportApplicationService: Symbol.for('IGeppoImportApplicationService'),
    ProjectMappingService: Symbol.for('ProjectMappingService'),
    UserMappingService: Symbol.for('UserMappingService'),
    TaskMappingService: Symbol.for('TaskMappingService'),


    ITaskFactory: Symbol.for('ITaskFactory'),

    // Infrastructure
    PrismaClient: Symbol.for('PrismaClient'),
}
