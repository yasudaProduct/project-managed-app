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


const container: Container = new Container();
// アプリケーションサービス
container.bind<IProjectApplicationService>(SYMBOL.IProjectApplicationService).to(ProjectApplicationService).inSingletonScope();
container.bind<IWbsApplicationService>(SYMBOL.IWbsApplicationService).to(WbsApplicationService).inSingletonScope();
container.bind<ITaskApplicationService>(SYMBOL.ITaskApplicationService).to(TaskApplicationService).inSingletonScope();
container.bind<IScheduleGenerateService>(SYMBOL.IScheduleGenerateService).to(ScheduleGenerateService).inSingletonScope();

// ドメインサービス
container.bind<GetOperationPossible>(SYMBOL.GetOperationPossible).to(GetOperationPossible).inSingletonScope();
container.bind<ScheduleGenerate>(SYMBOL.ScheduleGenerate).to(ScheduleGenerate).inSingletonScope();

// リポジトリ
container.bind<IProjectRepository>(SYMBOL.IProjectRepository).to(ProjectRepository).inSingletonScope();
container.bind<IWbsRepository>(SYMBOL.IWbsRepository).to(WbsRepository).inSingletonScope();
container.bind<IPhaseRepository>(SYMBOL.IPhaseRepository).to(PhaseRepository).inSingletonScope();
container.bind<ITaskRepository>(SYMBOL.ITaskRepository).to(TaskRepository).inSingletonScope();
container.bind<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository).to(WbsAssigneeRepository).inSingletonScope();

// ファクトリ
container.bind<ITaskFactory>(SYMBOL.ITaskFactory).to(TaskFactory).inSingletonScope();


export { container };