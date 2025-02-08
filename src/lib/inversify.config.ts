import { IProjectRepository } from "@/applications/projects/iproject-repository";
import { IProjectApplicationService, ProjectApplicationService } from "@/applications/projects/project-application-service";
import { ITaskRepository } from "@/applications/task/itask-repository";
import { ITaskApplicationService, TaskApplicationService } from "@/applications/task/task-application-service";
import { ProjectRepository } from "@/infrastructures/project-repository";
import { TaskRepository } from "@/infrastructures/task-repository";
import { SYMBOL } from "@/types/symbol";
import { Container } from "inversify";


const container: Container = new Container();
container.bind<IProjectRepository>(SYMBOL.IProjectRepository).to(ProjectRepository).inSingletonScope();
container.bind<IProjectApplicationService>(SYMBOL.IProjectApplicationService).to(ProjectApplicationService).inSingletonScope();
container.bind<ITaskRepository>(SYMBOL.ITaskRepository).to(TaskRepository).inSingletonScope();
container.bind<ITaskApplicationService>(SYMBOL.ITaskApplicationService).to(TaskApplicationService).inSingletonScope();

export { container };