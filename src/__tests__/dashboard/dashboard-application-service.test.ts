import { DashboardApplicationService } from "@/applications/dashboard/dashboard-application-service";
import { IProjectRepository } from "@/applications/projects/iproject-repository";
import { IWbsRepository } from "@/applications/wbs/iwbs-repository";
import { ITaskRepository } from "@/applications/task/itask-repository";
import { Project } from "@/domains/project/project";
import { ProjectStatus } from "@/domains/project/project-status";
import { Task } from "@/domains/task/task";
import { TaskStatus } from "@/domains/task/value-object/project-status";
import { TaskId } from "@/domains/task/value-object/task-id";
import { Wbs } from "@/domains/wbs/wbs";

const mockProjectRepository: jest.Mocked<IProjectRepository> = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
};

const mockWbsRepository: jest.Mocked<IWbsRepository> = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    findByProjectId: jest.fn(),
    findAll: jest.fn(),
};

const mockTaskRepository: jest.Mocked<ITaskRepository> = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findByAssigneeId: jest.fn(),
};

describe("DashboardApplicationService", () => {
    let service: DashboardApplicationService;

    beforeEach(() => {
        service = new DashboardApplicationService(
            mockProjectRepository,
            mockWbsRepository,
            mockTaskRepository
        );
        jest.clearAllMocks();
    });

    describe("getDashboardStats", () => {
        it("should return correct dashboard statistics", async () => {
            // Arrange
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now
            
            const mockProjects = [
                Project.createFromDb({
                    id: "1",
                    name: "Active Project",
                    status: new ProjectStatus({ status: "ACTIVE" }),
                    startDate: new Date("2024-01-01"),
                    endDate: futureDate,
                }),
                Project.createFromDb({
                    id: "2",
                    name: "Inactive Project",
                    status: new ProjectStatus({ status: "INACTIVE" }),
                    startDate: new Date("2024-01-01"),
                    endDate: futureDate,
                }),
            ];

            const mockWbs = [
                Wbs.createFromDb({ id: 1, name: "WBS1", projectId: "1" }),
                Wbs.createFromDb({ id: 2, name: "WBS2", projectId: "2" }),
            ];

            const mockTasks = [
                Task.createFromDb({
                    id: 1,
                    taskNo: TaskId.reconstruct("A1-0001"),
                    wbsId: 1,
                    name: "Task 1",
                    status: new TaskStatus({ status: "COMPLETED" }),
                }),
                Task.createFromDb({
                    id: 2,
                    taskNo: TaskId.reconstruct("A1-0002"),
                    wbsId: 2,
                    name: "Task 2",
                    status: new TaskStatus({ status: "IN_PROGRESS" }),
                }),
            ];

            mockProjectRepository.findAll.mockResolvedValue(mockProjects);
            mockWbsRepository.findAll.mockResolvedValue(mockWbs);
            mockTaskRepository.findAll.mockResolvedValue(mockTasks);

            // Act
            const result = await service.getDashboardStats();

            // Assert
            expect(result).toEqual({
                totalProjects: 2,
                activeProjects: 1,
                totalTasks: 2,
                completedTasks: 1,
                totalWbs: 2,
                projectsByStatus: [
                    { status: "ACTIVE", count: 1 },
                    { status: "INACTIVE", count: 1 },
                ],
                tasksByStatus: [
                    { status: "COMPLETED", count: 1 },
                    { status: "IN_PROGRESS", count: 1 },
                ],
                upcomingDeadlines: [],
                overdueProjects: [],
            });
        });

        it("should identify upcoming deadlines correctly", async () => {
            // Arrange
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

            const mockProjects = [
                Project.createFromDb({
                    id: "1",
                    name: "Upcoming Project",
                    status: new ProjectStatus({ status: "ACTIVE" }),
                    startDate: new Date("2024-01-01"),
                    endDate: futureDate,
                }),
            ];

            mockProjectRepository.findAll.mockResolvedValue(mockProjects);
            mockWbsRepository.findAll.mockResolvedValue([]);
            mockTaskRepository.findAll.mockResolvedValue([]);

            // Act
            const result = await service.getDashboardStats();

            // Assert
            expect(result.upcomingDeadlines).toHaveLength(1);
            expect(result.upcomingDeadlines[0]).toEqual({
                projectId: "1",
                projectName: "Upcoming Project",
                endDate: futureDate,
            });
        });

        it("should identify overdue projects correctly", async () => {
            // Arrange
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

            const mockProjects = [
                Project.createFromDb({
                    id: "1",
                    name: "Overdue Project",
                    status: new ProjectStatus({ status: "ACTIVE" }),
                    startDate: new Date("2024-01-01"),
                    endDate: pastDate,
                }),
            ];

            mockProjectRepository.findAll.mockResolvedValue(mockProjects);
            mockWbsRepository.findAll.mockResolvedValue([]);
            mockTaskRepository.findAll.mockResolvedValue([]);

            // Act
            const result = await service.getDashboardStats();

            // Assert
            expect(result.overdueProjects).toHaveLength(1);
            expect(result.overdueProjects[0]).toEqual({
                projectId: "1",
                projectName: "Overdue Project",
                endDate: pastDate,
            });
        });

        it("should handle empty data gracefully", async () => {
            // Arrange
            mockProjectRepository.findAll.mockResolvedValue([]);
            mockWbsRepository.findAll.mockResolvedValue([]);
            mockTaskRepository.findAll.mockResolvedValue([]);

            // Act
            const result = await service.getDashboardStats();

            // Assert
            expect(result).toEqual({
                totalProjects: 0,
                activeProjects: 0,
                totalTasks: 0,
                completedTasks: 0,
                totalWbs: 0,
                projectsByStatus: [],
                tasksByStatus: [],
                upcomingDeadlines: [],
                overdueProjects: [],
            });
        });
    });
});