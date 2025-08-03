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
import type { IAuthApplicationService } from "@/applications/auth/auth-application-service";
import { AuthApplicationService } from "@/applications/auth/auth-application-service";
import type { IAuthRepository } from "@/domains/auth/auth-service";
import { AuthRepository } from "@/infrastructures/auth-repository";

// Geppo関連
import type { IGeppoApplicationService } from "@/applications/geppo/geppo-application-service";
import { GeppoApplicationService } from "@/applications/geppo/geppo-application-service";
import type { IGeppoRepository } from "@/applications/geppo/repositories/igeppo.repository";
import { GeppoPrismaRepository } from "@/infrastructures/geppo/geppo-prisma.repository";


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

// ドメインサービス
container.bind<GetOperationPossible>(SYMBOL.GetOperationPossible).to(GetOperationPossible).inSingletonScope();
container.bind<ScheduleGenerate>(SYMBOL.ScheduleGenerate).to(ScheduleGenerate).inSingletonScope();

// リポジトリ
container.bind<IProjectRepository>(SYMBOL.IProjectRepository).to(ProjectRepository).inSingletonScope();
container.bind<IWbsRepository>(SYMBOL.IWbsRepository).to(WbsRepository).inSingletonScope();
container.bind<IPhaseRepository>(SYMBOL.IPhaseRepository).to(PhaseRepository).inSingletonScope();
container.bind<ITaskRepository>(SYMBOL.ITaskRepository).to(TaskRepository).inSingletonScope();
container.bind<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository).to(WbsAssigneeRepository).inSingletonScope();
container.bind<IDashboardQueryRepository>(SYMBOL.IDashboardQueryRepository).to(DashboardQueryRepository).inSingletonScope();
container.bind<IAuthRepository>(SYMBOL.IAuthRepository).to(AuthRepository).inSingletonScope();
container.bind<IGeppoRepository>(SYMBOL.IGeppoRepository).to(GeppoPrismaRepository).inSingletonScope();

// ファクトリ
container.bind<ITaskFactory>(SYMBOL.ITaskFactory).to(TaskFactory).inSingletonScope();

// CQRS
container.bind<IQueryBus>(SYMBOL.IQueryBus).to(QueryBus).inSingletonScope();
container.bind<GetDashboardStatsHandler>(SYMBOL.GetDashboardStatsHandler).to(GetDashboardStatsHandler).inSingletonScope();

// QueryBusの初期化（ハンドラーの登録）
const queryBus = container.get<QueryBus>(SYMBOL.IQueryBus);
const dashboardStatsHandler = container.get<GetDashboardStatsHandler>(SYMBOL.GetDashboardStatsHandler);
queryBus.register(GetDashboardStatsQuery as new (...args: unknown[]) => GetDashboardStatsQuery, dashboardStatsHandler);

export { container };