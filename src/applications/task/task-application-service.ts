import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { ITaskRepository, ManualSnapshotContext } from "./itask-repository";
import { WbsTask, type TaskStatus } from "@/types/wbs";
import { Task } from "@/domains/task/task";
import { TaskStatus as TaskStatusVO } from "@/domains/task/value-object/task-status";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";
import type { ITaskFactory } from "@/domains/task/interfaces/task-factory";
import { TaskProgressCalculator } from "@/domains/task/task-progress-calculator";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import { buildProgressSnapshotInput, DEFAULT_COST_PER_HOUR } from "./progress-snapshot-input-builder";

export interface CreateTaskCommand {
    name: string;
    wbsId: number;
    phaseId: number;
    yoteiStartDate: Date;
    yoteiEndDate: Date;
    yoteiKosu: number;
    assigneeId?: number;
    status: TaskStatus;
}

export interface ITaskApplicationService {
    getTaskById(id: number): Promise<WbsTask | null>;
    getTaskAll(wbsId: number): Promise<WbsTask[]>;
    createTask(command: CreateTaskCommand): Promise<{ success: boolean; id?: number; error?: string }>;
    updateTask(args: { wbsId: number; updateTask: WbsTask }): Promise<{ success: boolean; error?: string; id?: string }>;
    deleteTask(id: number): Promise<{ success: boolean; error?: string }>;
    getTaskStatusCount(wbsId: number): Promise<{ todo: number; inProgress: number; completed: number }>;
    getTaskProgressByPhase(wbsId: number): Promise<Array<{ phase: string; total: number; todo: number; inProgress: number; completed: number }>>;
    getKosuSummary(wbsId: number): Promise<Record<string, { kijun: number; yotei: number; jisseki: number }>>;
    calculateEffectiveProgress(
        status: TaskStatus,
        progressRate: number | null,
        progressMethod: ProgressMeasurementMethod
    ): number;
}

@injectable()
export class TaskApplicationService implements ITaskApplicationService {

    constructor(
        @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
        @inject(SYMBOL.ITaskFactory) private readonly taskFactory: ITaskFactory,
        @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
    ) {
    }

    public async getTaskById(id: number): Promise<WbsTask | null> {
        const task = await this.taskRepository.findById(id);
        if (!task) return null;
        return {
            id: task.id!,
            taskNo: task.taskNo!.getValue(),
            name: task.name,
            status: task.getStatus(),
            assigneeId: task.assigneeId ?? undefined,
            assignee: task.assignee ? {
                id: task.assignee.id!,
                name: task.assignee.name,
                displayName: task.assignee.displayName,
            } : undefined,
            phaseId: task.phaseId ?? undefined,
            phase: task.phase ? {
                id: task.phase.id!,
                name: task.phase.name,
                seq: task.phase.seq,
            } : undefined,
            // kijunStart: task.getKijunStart(),
            // kijunEnd: task.getKijunEnd(),
            // kijunKosu: task.getKijunKosus(),
            yoteiStart: task.getYoteiStart(),
            yoteiEnd: task.getYoteiEnd(),
            yoteiKosu: task.getYoteiKosus(),
            // jissekiStart: task.getJissekiStart(),
            // jissekiEnd: task.getJissekiEnd(),
            // jissekiKosu: task.getJissekiKosus(),
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        };
    }

    public async getTaskAll(wbsId: number): Promise<WbsTask[]> {
        const tasks = await this.taskRepository.findAll(wbsId);

        return tasks.map(task => ({
            id: task.id!,
            taskNo: task.taskNo!.getValue(),
            name: task.name,
            status: task.getStatus(),
            assigneeId: task.assigneeId ?? undefined,
            assignee: task.assignee ? {
                id: task.assignee.id!,
                name: task.assignee.name,
                displayName: task.assignee.displayName,
            } : undefined,
            phaseId: task.phaseId ?? undefined,
            phase: task.phase ? {
                id: task.phase.id!,
                name: task.phase.name,
                seq: task.phase.seq,
            } : undefined,
            // kijunStart: task.getKijunStart(),
            // kijunEnd: task.getKijunEnd(),
            // kijunKosu: task.getKijunKosus(),
            yoteiStart: task.getYoteiStart(),
            yoteiEnd: task.getYoteiEnd(),
            yoteiKosu: task.getYoteiKosus(),
            jissekiStart: task.getJissekiStart(),
            jissekiEnd: task.getJissekiEnd(),
            jissekiKosu: task.getJissekiKosus(),
            progressRate: task.progressRate,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        }));
    }

    public async createTask(command: CreateTaskCommand): Promise<{ success: boolean; id?: number; error?: string }> {
        const { name, wbsId, phaseId, yoteiStartDate, yoteiEndDate, yoteiKosu, assigneeId, status } = command;

        const task = Task.create(
            {
                taskNo: await this.taskFactory.createTaskId(wbsId, phaseId),
                wbsId,
                name,
                phaseId,
                assigneeId,
                status: new TaskStatusVO({ status }),
                periods: [
                    Period.create({
                        startDate: yoteiStartDate,
                        endDate: yoteiEndDate,
                        type: new PeriodType({ type: "YOTEI" }),
                        manHours: [
                            ManHour.create({
                                kosu: yoteiKosu,
                                type: new ManHourType({ type: "NORMAL" }),
                            })
                        ]
                    })
                ]

            }
        );

        const result = await this.taskRepository.create(task);
        return { success: true, id: result.id };
    }

    public async updateTask(args: { wbsId: number, updateTask: WbsTask }): Promise<{ success: boolean; error?: string; id?: string }> {
        const { wbsId, updateTask } = args;

        const task: Task | null = await this.taskRepository.findById(updateTask.id);
        if (!task) {
            return { success: false, error: "タスクが見つかりません" };
        }

        // 重複確認 ドメインサービス
        // タスク名が重複しているか確認
        // const tasks = await this.taskRepository.findAll(task.wbsId);
        // if (tasks.some(t => t.name === updateTask.name)) {
        //     return { success: false, error: "タスク名が重複しています" };
        // }

        task.update({
            name: updateTask.name,
            assigneeId: updateTask.assigneeId,
            phaseId: updateTask.phaseId,
            status: new TaskStatusVO({ status: updateTask.status }),
        });
        // if (updateTask.kijunStart) task.updateKijun(updateTask.kijunStart, updateTask.kijunEnd ?? updateTask.kijunStart, updateTask.kijunKosu ?? 0);
        if (updateTask.yoteiStart) task.updateYotei({ startDate: updateTask.yoteiStart, endDate: updateTask.yoteiEnd ?? updateTask.yoteiStart, kosu: updateTask.yoteiKosu ?? 0 });
        if (updateTask.progressRate !== undefined) task.updateProgressRate(updateTask.progressRate);

        // 手動編集も進捗履歴（スナップショット）として記録し、EVMの過去チャートへ反映できるようにする
        const snapshot = await this.buildManualSnapshot(wbsId, task);
        const result = await this.taskRepository.update(wbsId, task, snapshot);

        return { success: true, id: result.taskNo!.getValue() };

    }

    /**
     * 手動編集（ガント・タスクモーダル等）用の進捗スナップショット文脈を構築する。
     * 実績日は直近スナップショットから引き継ぐ（手動編集では自己申告実績を持たないため）。
     */
    private async buildManualSnapshot(wbsId: number, task: Task): Promise<ManualSnapshotContext> {
        const assignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);
        const costPerHour =
            task.assigneeId !== undefined
                ? (assignees.find(a => a.id === task.assigneeId)?.getCostPerHour() ?? DEFAULT_COST_PER_HOUR)
                : DEFAULT_COST_PER_HOUR;
        const actuals = task.id !== undefined
            ? await this.taskRepository.findLatestSnapshotActuals(task.id)
            : null;

        return {
            wbsId,
            input: buildProgressSnapshotInput({
                task,
                costPerHour,
                actualStart: actuals?.actualStart ?? null,
                actualEnd: actuals?.actualEnd ?? null,
            }),
            snapshotAt: new Date(),
        };
    }

    public async deleteTask(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            const task = await this.taskRepository.findById(id);
            if (!task) {
                return { success: false, error: "タスクが存在しません" };
            }

            // 削除も履歴に tombstone として残し、削除以降のEVM寄与を0にする
            // （スナップショットはタスクへのFKを持たないため削除後も保持される）
            const tombstone: ManualSnapshotContext = {
                wbsId: task.wbsId,
                input: {
                    taskId: id,
                    taskNo: task.taskNo.getValue(),
                    progressRate: null,
                    status: 'NOT_STARTED',
                    plannedManHours: 0,
                    baseManHours: 0,
                    costPerHour: 0,
                    plannedStart: null,
                    plannedEnd: null,
                    baseStart: null,
                    baseEnd: null,
                    actualStart: null,
                    actualEnd: null,
                    isRemoved: true,
                },
                snapshotAt: new Date(),
            };
            await this.taskRepository.delete(id, tombstone);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "タスクの削除に失敗しました" };
        }
    }

    public async getTaskStatusCount(wbsId: number): Promise<{ todo: number; inProgress: number; completed: number }> {
        const tasks = await this.taskRepository.findByWbsId(wbsId);

        const statusCount = {
            todo: 0,
            inProgress: 0,
            completed: 0,
        };

        tasks.forEach(task => {
            const status = task.status.getStatus();
            switch (status) {
                case 'NOT_STARTED':
                    statusCount.todo++;
                    break;
                case 'IN_PROGRESS':
                    statusCount.inProgress++;
                    break;
                case 'COMPLETED':
                    statusCount.completed++;
                    break;
            }
        });

        return statusCount;
    }

    public async getTaskProgressByPhase(wbsId: number): Promise<Array<{ phase: string; total: number; todo: number; inProgress: number; completed: number }>> {
        // このメソッドの実装には PhaseRepository と Task の統合的な操作が必要
        // 簡略化版として実装（実際の実装では適切なリポジトリ連携が必要）
        const tasks = await this.taskRepository.findByWbsId(wbsId);

        // フェーズごとにタスクをグループ化
        const phaseGroups = new Map<number, Task[]>();
        tasks.forEach(task => {
            if (task.phaseId) {
                if (!phaseGroups.has(task.phaseId)) {
                    phaseGroups.set(task.phaseId, []);
                }
                phaseGroups.get(task.phaseId)!.push(task);
            }
        });

        const progressData: Array<{ phase: string; total: number; todo: number; inProgress: number; completed: number }> = [];

        for (const [phaseId, phaseTasks] of phaseGroups) {
            const statusCount = { todo: 0, inProgress: 0, completed: 0 };

            phaseTasks.forEach(task => {
                const status = task.status.getStatus();
                switch (status) {
                    case 'NOT_STARTED':
                        statusCount.todo++;
                        break;
                    case 'IN_PROGRESS':
                        statusCount.inProgress++;
                        break;
                    case 'COMPLETED':
                        statusCount.completed++;
                        break;
                }
            });

            progressData.push({
                phase: `Phase ${phaseId}`, // 実際はPhaseRepositoryからフェーズ名を取得
                total: phaseTasks.length,
                ...statusCount
            });
        }

        return progressData;
    }

    public async getKosuSummary(wbsId: number): Promise<Record<string, { kijun: number; yotei: number; jisseki: number }>> {
        const tasks = await this.taskRepository.findByWbsId(wbsId);

        const phaseSummary: Record<string, { kijun: number; yotei: number; jisseki: number }> = {};

        tasks.forEach(task => {
            const phaseName = `Phase ${task.phaseId || '未分類'}`;
            if (!phaseSummary[phaseName]) {
                phaseSummary[phaseName] = {
                    kijun: 0,
                    yotei: 0,
                    jisseki: 0,
                };
            }

            // ドメインオブジェクトから工数を取得
            const kijunKosu = task.getKijunKosus();
            const yoteiKosu = task.getYoteiKosus();
            const jissekiKosu = task.getJissekiKosus();

            if (kijunKosu) phaseSummary[phaseName].kijun += kijunKosu;
            if (yoteiKosu) phaseSummary[phaseName].yotei += yoteiKosu;
            if (jissekiKosu) phaseSummary[phaseName].jisseki += jissekiKosu;
        });

        return phaseSummary;
    }

    public calculateEffectiveProgress(
        status: TaskStatus,
        progressRate: number | null,
        progressMethod: ProgressMeasurementMethod
    ): number {
        return TaskProgressCalculator.calculateEffectiveProgress(
            status,
            progressRate,
            progressMethod
        );
    }
}
