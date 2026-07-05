import 'reflect-metadata';
import { IProjectRepository } from "@/applications/projects/iproject-repository";
import { IProjectApplicationService, ProjectApplicationService } from "@/applications/projects/project-application-service";
import { IScheduleGenerateService, ScheduleGenerateService } from "@/applications/schedule-generator/schedule-generate.service";
import { IAssigneeGanttService } from "@/applications/assignee-gantt/iassignee-gantt.service";
import { AssigneeGanttService } from "@/applications/assignee-gantt/assignee-gantt.service";
import { IPhaseRepository } from "@/applications/task/iphase-repository";
import { ITaskRepository } from "@/applications/task/itask-repository";
import { ITaskApplicationService, TaskApplicationService } from "@/applications/task/task-application-service";
import { TaskFactory } from "@/applications/task/task-factory";
import { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import { IWbsRepository } from "@/applications/wbs/iwbs-repository";
import type { IWbsBufferRepository } from "@/applications/wbs/iwbs-buffer-repository";
import { IWbsApplicationService, WbsApplicationService } from "@/applications/wbs/wbs-application-service";
import { IDashboardApplicationService, DashboardApplicationService } from "@/applications/dashboard/dashboard-application-service";
import { ITaskFactory } from "@/domains/task/interfaces/task-factory";
import { GetOperationPossible } from "@/domains/wbs/get-operation-possible";
import { ScheduleGenerate } from "@/domains/wbs/schedule-generate";
import { PhaseRepository } from "@/infrastructures/phase-repository";
import { ProjectRepository } from "@/infrastructures/project-repository";
import { TaskRepository } from "@/infrastructures/task-repository";
import { WbsAssigneeRepository } from "@/infrastructures/wbs-assignee-repository";
import { WbsRepository } from "@/infrastructures/wbs-repository";
import { WbsBufferRepository } from "@/infrastructures/wbs-buffer-repository";
import { SYMBOL } from "@/types/symbol";
import { Container } from "inversify";
import { IPhaseApplicationService, PhaseApplicationService } from "@/applications/phase/phase-application-service";
import { IQueryBus } from "@/applications/shared/cqrs/base-classes";
import { QueryBus } from "@/applications/shared/query-bus/query-bus";
import { GetDashboardStatsHandler } from "@/applications/dashboard/queries/get-dashboard-stats/get-dashboard-stats.handler";
import { GetDashboardStatsQuery } from "@/applications/dashboard/queries/get-dashboard-stats/get-dashboard-stats.query";
import type { IDashboardQueryRepository } from "@/applications/dashboard/repositories/idashboard-query.repository";
import { DashboardQueryRepository } from "@/infrastructures/dashboard-query.repository";
import { GetWbsSummaryHandler } from "@/applications/wbs/query/get-wbs-summary-handler";
import { GetWbsSummaryQuery } from "@/applications/wbs/query/get-wbs-summary-query";
import { GetWbsTaskSummaryHandler } from "@/applications/wbs/query/get-wbs-task-summary-handler";
import { GetWbsTaskSummaryQuery } from "@/applications/wbs/query/get-wbs-task-summary-query";
import type { IWbsQueryRepository } from "@/applications/wbs/query/wbs-query-repository";
import { WbsQueryRepository } from "@/infrastructures/wbs/wbs-query-repository";
import type { IAuthApplicationService } from "@/applications/auth/auth-application-service";
import { AuthApplicationService } from "@/applications/auth/auth-application-service";
import type { IAuthRepository } from "@/applications/auth/iauth-repository";
import { AuthRepository } from "@/infrastructures/auth-repository";

// Geppo関連
import type { IGeppoApplicationService } from "@/applications/geppo/geppo-application-service";
import { GeppoApplicationService } from "@/applications/geppo/geppo-application-service";
import type { IGeppoRepository } from "@/applications/geppo/repositories/igeppo.repository";
import { GeppoPrismaRepository } from "@/infrastructures/geppo/geppo-prisma.repository";
import { IUserRepository } from "@/applications/user/iuser-repository";
import { UserRepository } from "@/infrastructures/user-repository";
import { IUserApplicationService, UserApplicationService } from "@/applications/user/user-application-service";

// Work Records関連
import type { IWorkRecordRepository } from "@/applications/work-record/repositories/iwork-record.repository";
import { WorkRecordPrismaRepository } from "@/infrastructures/work-record/work-record-prisma.repository";
import type { IWorkRecordApplicationService } from "@/applications/work-record/work-record-application-service";
import { WorkRecordApplicationService } from "@/applications/work-record/work-record-application-service";

// Geppo Import関連
import type { IGeppoImportApplicationService } from "@/applications/geppo-import/geppo-import-application-service";
import { GeppoImportApplicationService } from "@/applications/geppo-import/geppo-import-application-service";
import type { IProjectMappingService } from "@/applications/geppo-import/iproject-mapping-service";
import { ProjectMappingService } from "@/infrastructures/geppo-import/project-mapping.service";
import type { IUserMappingService } from "@/applications/geppo-import/iuser-mapping-service";
import { UserMappingService } from "@/infrastructures/geppo-import/user-mapping.service";
import type { ITaskMappingService } from "@/applications/geppo-import/itask-mapping-service";
import { TaskMappingService } from "@/infrastructures/geppo-import/task-mapping.service";

// Task Dependency関連
import type { ITaskDependencyRepository } from "@/applications/task-dependency/itask-dependency-repository";
import { TaskDependencyRepository } from "@/infrastructures/task-dependency-repository";
import { ITaskDependencyService, TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";

// WBS Sync関連
import { WbsSyncApplicationService } from "@/applications/wbs-sync/wbs-sync-application.service";
import type { IExcelWbsRepository } from "@/applications/wbs-sync/iexcel-wbs-repository";
import { ExcelWbsRepository } from "@/infrastructures/sync/excel-wbs-repository";
import type { ISyncLogRepository } from "@/applications/wbs-sync/isync-log-repository";
import { SyncLogRepository } from "@/infrastructures/sync/sync-log-repository";

// Calendar関連
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import { CompanyHolidayRepository } from "@/infrastructures/calendar/company-holiday-repository";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import { UserScheduleRepository } from "@/infrastructures/calendar/user-schedule-repository";
import { ICompanyHolidayApplicationService, CompanyHolidayApplicationService } from "@/applications/calendar/company-holiday-application-service";

// Notification関連
import type { INotificationService } from "@/applications/notification/inotification-service";
import { NotificationService } from "@/applications/notification/notification-service";
import type { INotificationRepository } from "@/applications/notification/inotification-repository";
import { NotificationRepository } from "@/infrastructures/notification/notification-repository";
import type { IPushNotificationService } from "@/applications/notification/ipush-notification-service";
import { PushNotificationService } from "@/infrastructures/notification/push-notification-service";
import { NotificationEventDetector } from "@/applications/notification/notification-event-detector";

// Task Scheduling関連
import type { ISchedulingApplicationService } from "@/applications/task-scheduling/ischeduling-application.service";
import { SchedulingApplicationService } from "@/applications/task-scheduling/scheduling-application.service";
import type { ISchedulingSettingsRepository } from "@/applications/task-scheduling/ischeduling-settings-repository";
import { SchedulingSettingsRepository } from "@/infrastructures/scheduling-settings-repository";

// Project Settings関連
import type { IProjectSettingsRepository } from "@/applications/project-settings/iproject-settings-repository";
import { ProjectSettingsRepository } from "@/infrastructures/project-settings/project-settings-repository";
import type { IProjectSettingsApplicationService } from "@/applications/project-settings/project-settings-application-service";
import { ProjectSettingsApplicationService } from "@/applications/project-settings/project-settings-application-service";

// Forecast関連
import type { IForecastApplicationService } from "@/applications/forecast/forecast-application-service";
import { ForecastApplicationService } from "@/applications/forecast/forecast-application-service";

// Prisma
import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma/prisma';
import { IMilestoneApplicationService, MilestoneApplicationService } from '@/applications/milestone/milestone-application-service';
import { IMilestoneRepository } from '@/applications/milestone/imilestone-repository';
import { IScheduleApplicationService, ScheduleApplicationService } from '@/applications/schedule/schedule-application-service';
import { MilestoneRepository } from '@/infrastructures/milestone/milestone.repository';

// EVM関連
import { IWbsEvmRepository } from '@/applications/evm/iwbs-evm-repository';
import { WbsEvmRepository } from '@/infrastructures/evm/wbs-evm-repository';
import { IEvmService, EvmService } from '@/applications/evm/evm-service';

// Import Job関連
import type { IImportJobRepository } from '@/applications/import-job/iimport-job.repository';
import { ImportJobPrismaRepository } from '@/infrastructures/import-job/import-job-prisma.repository';
import type { IImportJobApplicationService } from '@/applications/import-job/import-job-application.service';
import { ImportJobApplicationService } from '@/applications/import-job/import-job-application.service';
import { IWbsSyncApplicationService } from '@/applications/wbs-sync/iwbs-sync-application-service';

// System Settings関連
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import { SystemSettingsRepository } from '@/infrastructures/system-settings/system-settings-repository';
import type { ISystemSettingsApplicationService } from '@/applications/system-settings/system-settings-application-service';
import { SystemSettingsApplicationService } from '@/applications/system-settings/system-settings-application-service';

// WBS Tags関連
import type { IWbsTagRepository } from '@/applications/wbs/iwbs-tag-repository';
import { WbsTagRepository } from '@/infrastructures/wbs/wbs-tag-repository';
import type { IWbsTagApplicationService } from '@/applications/wbs/wbs-tag-application-service';
import { WbsTagApplicationService } from '@/applications/wbs/wbs-tag-application-service';

// WBS Analytics関連
import type { IWbsCrossQueryRepository } from '@/applications/wbs/iwbs-cross-query-repository';
import { WbsCrossQueryRepository } from '@/infrastructures/wbs/wbs-cross-query-repository';
import { IWbsAnalyticsApplicationService, WbsAnalyticsApplicationService } from '@/applications/wbs/wbs-analytics-application-service';



const container: Container = new Container();
// アプリケーションサービス
container.bind<IProjectApplicationService>(SYMBOL.IProjectApplicationService).to(ProjectApplicationService).inSingletonScope();
container.bind<IWbsApplicationService>(SYMBOL.IWbsApplicationService).to(WbsApplicationService).inSingletonScope();
container.bind<ITaskApplicationService>(SYMBOL.ITaskApplicationService).to(TaskApplicationService).inSingletonScope();
container.bind<IScheduleGenerateService>(SYMBOL.IScheduleGenerateService).to(ScheduleGenerateService).inSingletonScope();
container.bind<IAssigneeGanttService>(SYMBOL.IAssigneeGanttService).to(AssigneeGanttService).inSingletonScope();
container.bind<IDashboardApplicationService>(SYMBOL.IDashboardApplicationService).to(DashboardApplicationService).inSingletonScope();
container.bind<IPhaseApplicationService>(SYMBOL.IPhaseApplicationService).to(PhaseApplicationService).inSingletonScope();
container.bind<IAuthApplicationService>(SYMBOL.IAuthApplicationService).to(AuthApplicationService).inSingletonScope();
container.bind<IGeppoApplicationService>(SYMBOL.IGeppoApplicationService).to(GeppoApplicationService).inSingletonScope();
container.bind<IWorkRecordApplicationService>(SYMBOL.IWorkRecordApplicationService).to(WorkRecordApplicationService).inSingletonScope();
container.bind<IUserApplicationService>(SYMBOL.IUserApplicationService).to(UserApplicationService).inSingletonScope();
container.bind<IGeppoImportApplicationService>(SYMBOL.IGeppoImportApplicationService).to(GeppoImportApplicationService).inSingletonScope();
container.bind<ITaskDependencyService>(SYMBOL.ITaskDependencyService).to(TaskDependencyService).inSingletonScope();
container.bind<IMilestoneApplicationService>(SYMBOL.IMilestoneApplicationService).to(MilestoneApplicationService).inSingletonScope();
container.bind<IScheduleApplicationService>(SYMBOL.IScheduleApplicationService).to(ScheduleApplicationService).inSingletonScope();
container.bind<IEvmService>(SYMBOL.IEvmService).to(EvmService).inSingletonScope();
container.bind<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService).to(ImportJobApplicationService).inSingletonScope();
container.bind<INotificationService>(SYMBOL.INotificationService).to(NotificationService).inSingletonScope();
container.bind<IPushNotificationService>(SYMBOL.IPushNotificationService).to(PushNotificationService).inSingletonScope();
container.bind<NotificationEventDetector>(SYMBOL.NotificationEventDetector).to(NotificationEventDetector).inSingletonScope();
container.bind<ISchedulingApplicationService>(SYMBOL.ISchedulingApplicationService).to(SchedulingApplicationService).inSingletonScope();
container.bind<IWbsSyncApplicationService>(SYMBOL.IWbsSyncApplicationService).to(WbsSyncApplicationService).inSingletonScope();
container.bind<ISystemSettingsApplicationService>(SYMBOL.ISystemSettingsApplicationService).to(SystemSettingsApplicationService).inSingletonScope();
container.bind<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService).to(WbsTagApplicationService).inSingletonScope();
container.bind<IWbsAnalyticsApplicationService>(SYMBOL.IWbsAnalyticsApplicationService).to(WbsAnalyticsApplicationService).inSingletonScope();
container.bind<IProjectSettingsApplicationService>(SYMBOL.IProjectSettingsApplicationService).to(ProjectSettingsApplicationService).inSingletonScope();
container.bind<IForecastApplicationService>(SYMBOL.IForecastApplicationService).to(ForecastApplicationService).inSingletonScope();
container.bind<ICompanyHolidayApplicationService>(SYMBOL.ICompanyHolidayApplicationService).to(CompanyHolidayApplicationService).inSingletonScope();

// ドメインサービス
container.bind<GetOperationPossible>(SYMBOL.GetOperationPossible).to(GetOperationPossible).inSingletonScope();
container.bind<ScheduleGenerate>(SYMBOL.ScheduleGenerate).to(ScheduleGenerate).inSingletonScope();

// リポジトリ
container.bind<IProjectRepository>(SYMBOL.IProjectRepository).to(ProjectRepository).inSingletonScope();
container.bind<IWbsRepository>(SYMBOL.IWbsRepository).to(WbsRepository).inSingletonScope();
container.bind<IPhaseRepository>(SYMBOL.IPhaseRepository).to(PhaseRepository).inSingletonScope();
container.bind<ITaskRepository>(SYMBOL.ITaskRepository).to(TaskRepository).inSingletonScope();
container.bind<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository).to(WbsAssigneeRepository).inSingletonScope();
container.bind<IWbsBufferRepository>(SYMBOL.IWbsBufferRepository).to(WbsBufferRepository).inSingletonScope();
container.bind<IDashboardQueryRepository>(SYMBOL.IDashboardQueryRepository).to(DashboardQueryRepository).inSingletonScope();
container.bind<IAuthRepository>(SYMBOL.IAuthRepository).to(AuthRepository).inSingletonScope();
container.bind<IWbsQueryRepository>(SYMBOL.IWbsQueryRepository).to(WbsQueryRepository).inSingletonScope();
container.bind<IGeppoRepository>(SYMBOL.IGeppoRepository).to(GeppoPrismaRepository).inSingletonScope();
container.bind<IUserRepository>(SYMBOL.IUserRepository).to(UserRepository).inSingletonScope();
container.bind<IWorkRecordRepository>(SYMBOL.IWorkRecordRepository).to(WorkRecordPrismaRepository).inSingletonScope();
container.bind<ITaskDependencyRepository>(SYMBOL.ITaskDependencyRepository).to(TaskDependencyRepository).inSingletonScope();
container.bind<IExcelWbsRepository>(SYMBOL.IExcelWbsRepository).to(ExcelWbsRepository).inSingletonScope();
container.bind<ISyncLogRepository>(SYMBOL.ISyncLogRepository).to(SyncLogRepository).inSingletonScope();
container.bind<IMilestoneRepository>(SYMBOL.IMilestoneRepository).to(MilestoneRepository).inSingletonScope();
container.bind<ICompanyHolidayRepository>(SYMBOL.ICompanyHolidayRepository).to(CompanyHolidayRepository).inSingletonScope();
container.bind<IUserScheduleRepository>(SYMBOL.IUserScheduleRepository).to(UserScheduleRepository).inSingletonScope();
container.bind<IWbsEvmRepository>(SYMBOL.IWbsEvmRepository).to(WbsEvmRepository).inSingletonScope();
container.bind<IImportJobRepository>(SYMBOL.IImportJobRepository).to(ImportJobPrismaRepository).inSingletonScope();
container.bind<INotificationRepository>(SYMBOL.INotificationRepository).to(NotificationRepository).inSingletonScope();
container.bind<ISystemSettingsRepository>(SYMBOL.ISystemSettingsRepository).to(SystemSettingsRepository).inSingletonScope();
container.bind<ISchedulingSettingsRepository>(SYMBOL.ISchedulingSettingsRepository).to(SchedulingSettingsRepository).inSingletonScope();
container.bind<IProjectSettingsRepository>(SYMBOL.IProjectSettingsRepository).to(ProjectSettingsRepository).inSingletonScope();
container.bind<IWbsTagRepository>(SYMBOL.IWbsTagRepository).to(WbsTagRepository).inSingletonScope();
container.bind<IWbsCrossQueryRepository>(SYMBOL.IWbsCrossQueryRepository).to(WbsCrossQueryRepository).inSingletonScope();


// Geppo Import関連サービス
container.bind<IProjectMappingService>(SYMBOL.ProjectMappingService).to(ProjectMappingService).inSingletonScope();
container.bind<IUserMappingService>(SYMBOL.UserMappingService).to(UserMappingService).inSingletonScope();
container.bind<ITaskMappingService>(SYMBOL.TaskMappingService).to(TaskMappingService).inSingletonScope();

// インフラストラクチャ
container.bind<PrismaClient>(SYMBOL.PrismaClient).toConstantValue(prisma as unknown as PrismaClient);

// ファクトリ
container.bind<ITaskFactory>(SYMBOL.ITaskFactory).to(TaskFactory).inSingletonScope();

// CQRS
container.bind<IQueryBus>(SYMBOL.IQueryBus).to(QueryBus).inSingletonScope();
container.bind<GetDashboardStatsHandler>(SYMBOL.GetDashboardStatsHandler).to(GetDashboardStatsHandler).inSingletonScope();
container.bind<GetWbsSummaryHandler>(SYMBOL.GetWbsSummaryHandler).to(GetWbsSummaryHandler).inSingletonScope();
container.bind<GetWbsTaskSummaryHandler>(SYMBOL.GetWbsTaskSummaryHandler).to(GetWbsTaskSummaryHandler).inSingletonScope();

// QueryBusの初期化（ハンドラーの登録）
const queryBus = container.get<QueryBus>(SYMBOL.IQueryBus);
const dashboardStatsHandler = container.get<GetDashboardStatsHandler>(SYMBOL.GetDashboardStatsHandler);
queryBus.register(GetDashboardStatsQuery as new (...args: unknown[]) => GetDashboardStatsQuery, dashboardStatsHandler);

const wbsSummaryHandler = container.get<GetWbsSummaryHandler>(SYMBOL.GetWbsSummaryHandler);
queryBus.register(GetWbsSummaryQuery as new (...args: unknown[]) => GetWbsSummaryQuery, wbsSummaryHandler);

const wbsTaskSummaryHandler = container.get<GetWbsTaskSummaryHandler>(SYMBOL.GetWbsTaskSummaryHandler);
queryBus.register(GetWbsTaskSummaryQuery as new (...args: unknown[]) => GetWbsTaskSummaryQuery, wbsTaskSummaryHandler);

export { container };