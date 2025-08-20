import 'reflect-metadata';
import { IProjectRepository } from "@/applications/projects/iproject-repository";
import { IProjectApplicationService, ProjectApplicationService } from "@/applications/projects/project-application-service";
import { IScheduleGenerateService, ScheduleGenerateService } from "@/applications/schedule-generator/schedule-generate.service";
import { IPhaseRepository } from "@/applications/task/iphase-repository";
import { ITaskRepository } from "@/applications/task/itask-repository";
import { ITaskApplicationService, TaskApplicationService } from "@/applications/task/task-application-service";
import { TaskFactory } from "@/applications/task/task-factory";
import { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import { IWbsRepository } from "@/applications/wbs/iwbs-repository";
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
import type { IWbsQueryRepository } from "@/applications/wbs/query/wbs-query-repository";
import { WbsQueryRepository } from "@/infrastructures/wbs/wbs-query-repository";
import type { IAuthApplicationService } from "@/applications/auth/auth-application-service";
import { AuthApplicationService } from "@/applications/auth/auth-application-service";
import type { IAuthRepository } from "@/domains/auth/auth-service";
import { AuthRepository } from "@/infrastructures/auth-repository";

// Geppo関連
import type { IGeppoApplicationService } from "@/applications/geppo/geppo-application-service";
import { GeppoApplicationService } from "@/applications/geppo/geppo-application-service";
import type { IGeppoRepository } from "@/applications/geppo/repositories/igeppo.repository";
import { GeppoPrismaRepository } from "@/infrastructures/geppo/geppo-prisma.repository";
import { IUserRepository } from "@/applications/user/iuser-repositroy";
import { UserRepository } from "@/infrastructures/user-repository";

// Work Records関連
import type { IWorkRecordRepository } from "@/applications/work-record/repositories/iwork-record.repository";
import { WorkRecordPrismaRepository } from "@/infrastructures/work-record/work-record-prisma.repository";
import type { IWorkRecordApplicationService } from "@/applications/work-record/work-record-application-service";
import { WorkRecordApplicationService } from "@/applications/work-record/work-record-application-service";

// Geppo Import関連
import type { IGeppoImportApplicationService } from "@/applications/geppo-import/geppo-import-application-service";
import { GeppoImportApplicationService } from "@/applications/geppo-import/geppo-import-application-service";
import { ProjectMappingService } from "@/infrastructures/geppo-import/project-mapping.service";
import { UserMappingService } from "@/infrastructures/geppo-import/user-mapping.service";
import { TaskMappingService } from "@/infrastructures/geppo-import/task-mapping.service";

// Progress History関連
import type { IProgressHistoryRepository } from "@/applications/wbs-progress-history/iprogress-history-repository";
import { ProgressHistoryRepository } from "@/infrastructures/wbs-progress-history/progress-history-repository";
import { ProgressHistoryApplicationService } from "@/applications/wbs-progress-history/progress-history-application-service";
import type { IProgressHistoryApplicationService } from "@/applications/wbs-progress-history/progress-history-application-service";

// Task Dependency関連
import type { ITaskDependencyRepository } from "@/applications/task-dependency/itask-dependency-repository";
import { TaskDependencyRepository } from "@/infrastructures/task-dependency-repository";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";

// WBS Sync関連
import type { IWbsSyncService } from "@/domains/sync/IWbsSyncService";
import { WbsSyncService } from "@/domains/sync/WbsSyncService";
import type { IExcelWbsRepository } from "@/applications/sync/IExcelWbsRepository";
import { ExcelWbsRepository } from "@/infrastructures/sync/ExcelWbsRepository";
import type { ISyncLogRepository } from "@/applications/sync/ISyncLogRepository";
import { SyncLogRepository } from "@/infrastructures/sync/SyncLogRepository";
import type { IWbsSyncApplicationService } from "@/applications/sync/IWbsSyncApplicationService";
import { WbsSyncApplicationService } from "@/applications/sync/WbsSyncApplicationService";

// Prisma
import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';

const container: Container = new Container();
// アプリケーションサービス
container.bind<IProjectApplicationService>(SYMBOL.IProjectApplicationService).to(ProjectApplicationService).inSingletonScope();
container.bind<IWbsApplicationService>(SYMBOL.IWbsApplicationService).to(WbsApplicationService).inSingletonScope();
container.bind<ITaskApplicationService>(SYMBOL.ITaskApplicationService).to(TaskApplicationService).inSingletonScope();
container.bind<IScheduleGenerateService>(SYMBOL.IScheduleGenerateService).to(ScheduleGenerateService).inSingletonScope();
container.bind<IDashboardApplicationService>(SYMBOL.IDashboardApplicationService).to(DashboardApplicationService).inSingletonScope();
container.bind<IPhaseApplicationService>(SYMBOL.IPhaseApplicationService).to(PhaseApplicationService).inSingletonScope();
container.bind<IAuthApplicationService>(SYMBOL.IAuthApplicationService).to(AuthApplicationService).inSingletonScope();
container.bind<IGeppoApplicationService>(SYMBOL.IGeppoApplicationService).to(GeppoApplicationService).inSingletonScope();
container.bind<IWorkRecordApplicationService>(SYMBOL.IWorkRecordApplicationService).to(WorkRecordApplicationService).inSingletonScope();
container.bind<IGeppoImportApplicationService>(SYMBOL.IGeppoImportApplicationService).to(GeppoImportApplicationService).inSingletonScope();
container.bind<IProgressHistoryApplicationService>(SYMBOL.IProgressHistoryApplicationService).to(ProgressHistoryApplicationService).inSingletonScope();
container.bind<TaskDependencyService>(SYMBOL.ITaskDependencyService).to(TaskDependencyService).inSingletonScope();
container.bind<IWbsSyncApplicationService>(SYMBOL.IWbsSyncApplicationService).to(WbsSyncApplicationService).inSingletonScope();

// ドメインサービス
container.bind<GetOperationPossible>(SYMBOL.GetOperationPossible).to(GetOperationPossible).inSingletonScope();
container.bind<ScheduleGenerate>(SYMBOL.ScheduleGenerate).to(ScheduleGenerate).inSingletonScope();
container.bind<IWbsSyncService>(SYMBOL.IWbsSyncService).to(WbsSyncService).inSingletonScope();

// リポジトリ
container.bind<IProjectRepository>(SYMBOL.IProjectRepository).to(ProjectRepository).inSingletonScope();
container.bind<IWbsRepository>(SYMBOL.IWbsRepository).to(WbsRepository).inSingletonScope();
container.bind<IPhaseRepository>(SYMBOL.IPhaseRepository).to(PhaseRepository).inSingletonScope();
container.bind<ITaskRepository>(SYMBOL.ITaskRepository).to(TaskRepository).inSingletonScope();
container.bind<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository).to(WbsAssigneeRepository).inSingletonScope();
container.bind<IDashboardQueryRepository>(SYMBOL.IDashboardQueryRepository).to(DashboardQueryRepository).inSingletonScope();
container.bind<IAuthRepository>(SYMBOL.IAuthRepository).to(AuthRepository).inSingletonScope();
container.bind<IWbsQueryRepository>(SYMBOL.IWbsQueryRepository).to(WbsQueryRepository).inSingletonScope();
container.bind<IGeppoRepository>(SYMBOL.IGeppoRepository).to(GeppoPrismaRepository).inSingletonScope();
container.bind<IUserRepository>(SYMBOL.IUserRepository).to(UserRepository).inSingletonScope();
container.bind<IWorkRecordRepository>(SYMBOL.IWorkRecordRepository).to(WorkRecordPrismaRepository).inSingletonScope();
container.bind<IProgressHistoryRepository>(SYMBOL.IProgressHistoryRepository).to(ProgressHistoryRepository).inSingletonScope();
container.bind<ITaskDependencyRepository>(SYMBOL.ITaskDependencyRepository).to(TaskDependencyRepository).inSingletonScope();
container.bind<IExcelWbsRepository>(SYMBOL.IExcelWbsRepository).to(ExcelWbsRepository).inSingletonScope();
container.bind<ISyncLogRepository>(SYMBOL.ISyncLogRepository).to(SyncLogRepository).inSingletonScope();

// Geppo Import関連サービス
container.bind<ProjectMappingService>(SYMBOL.ProjectMappingService).to(ProjectMappingService).inSingletonScope();
container.bind<UserMappingService>(SYMBOL.UserMappingService).to(UserMappingService).inSingletonScope();
container.bind<TaskMappingService>(SYMBOL.TaskMappingService).to(TaskMappingService).inSingletonScope();

// インフラストラクチャ
container.bind<PrismaClient>(SYMBOL.PrismaClient).toConstantValue(prisma);

// ファクトリ
container.bind<ITaskFactory>(SYMBOL.ITaskFactory).to(TaskFactory).inSingletonScope();

// CQRS
container.bind<IQueryBus>(SYMBOL.IQueryBus).to(QueryBus).inSingletonScope();
container.bind<GetDashboardStatsHandler>(SYMBOL.GetDashboardStatsHandler).to(GetDashboardStatsHandler).inSingletonScope();
container.bind<GetWbsSummaryHandler>(SYMBOL.GetWbsSummaryHandler).to(GetWbsSummaryHandler).inSingletonScope();

// QueryBusの初期化（ハンドラーの登録）
const queryBus = container.get<QueryBus>(SYMBOL.IQueryBus);
const dashboardStatsHandler = container.get<GetDashboardStatsHandler>(SYMBOL.GetDashboardStatsHandler);
queryBus.register(GetDashboardStatsQuery as new (...args: unknown[]) => GetDashboardStatsQuery, dashboardStatsHandler);

const wbsSummaryHandler = container.get<GetWbsSummaryHandler>(SYMBOL.GetWbsSummaryHandler);
queryBus.register(GetWbsSummaryQuery as new (...args: unknown[]) => GetWbsSummaryQuery, wbsSummaryHandler);

export { container };