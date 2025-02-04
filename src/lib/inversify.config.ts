import { SYMBOL } from "@/types/symbol";
import { Container } from "inversify";
import { IProjectRepository } from "@/applications/iproject-repository";
import { ProjectRepository } from "@/infrastructures/project-repository";
import { IProjectApplicationService, ProjectApplicationService } from "@/applications/project-application-service";


const container: Container = new Container();
container.bind<IProjectRepository>(SYMBOL.IProjectRepository).to(ProjectRepository).inSingletonScope();
container.bind<IProjectApplicationService>(SYMBOL.IProjectApplicationService).to(ProjectApplicationService).inSingletonScope();

export { container };