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

    // Auth
    IAuthRepository: Symbol.for('IAuthRepository'),
    IAuthApplicationService: Symbol.for('IAuthApplicationService'),

    // Geppo
    IGeppoRepository: Symbol.for('IGeppoRepository'),
    IGeppoApplicationService: Symbol.for('IGeppoApplicationService'),

    ITaskFactory: Symbol.for('ITaskFactory'),
}
