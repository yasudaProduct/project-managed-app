import { ITaskRepository, SyncDiffBuckets, TaskSyncState, SyncDiffContext } from "@/applications/task/itask-repository";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";
import { Assignee } from "@/domains/task/assignee";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { TaskStatus } from "@/domains/task/value-object/task-status";
import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { WorkRecord } from "@/domains/work-records/work-recoed";
import prisma from "@/lib/prisma/prisma";
import { $Enums } from "@prisma/client";
import { injectable } from "inversify";

// $transaction コールバックが受け取る tx クライアントの型（拡張込みで推論）
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

@injectable()
export class TaskRepository implements ITaskRepository {

    async findById(id: number): Promise<Task | null> {
        console.log("repository: findById")
        const taskDb = await prisma.wbsTask.findFirst({
            where: { id: Number(id), isDeleted: false },
            include: {
                assignee: {
                    include: {
                        assignee: true
                    }
                },
                phase: true,
                periods: {
                    include: {
                        kosus: true,
                    },
                },
            }
        });

        if (!taskDb) return null;
        return Task.createFromDb({
            id: taskDb.id,
            taskNo: TaskNo.reconstruct(taskDb.taskNo),
            wbsId: taskDb.wbsId,
            name: taskDb.name,
            status: new TaskStatus({ status: taskDb.status }),
            assigneeId: taskDb.assigneeId ?? undefined,
            assignee: taskDb.assignee ? Assignee.createFromDb({
                id: taskDb.assignee.id,
                name: taskDb.assignee.assignee.name,
                displayName: taskDb.assignee.assignee.displayName,
            }) : undefined,
            phaseId: taskDb.phaseId ?? undefined,
            phase: taskDb.phase ? Phase.createFromDb({
                id: taskDb.phase.id,
                name: taskDb.phase.name,
                code: new PhaseCode(taskDb.phase.code),
                seq: taskDb.phase.seq,
            }) : undefined,
            periods: taskDb.periods.map(period => Period.createFromDb({
                id: period.id,
                startDate: period.startDate,
                endDate: period.endDate,
                type: new PeriodType({ type: period.type }),
                manHours: period.kosus.map(kosu => ManHour.createFromDb({
                    id: kosu.id,
                    kosu: Number(kosu.kosu),
                    type: new ManHourType({ type: kosu.type }),
                })),
            })),
            progressRate: taskDb.progressRate ? Number(taskDb.progressRate) : undefined,
        });
    }

    // async findAll(): Promise<Task[]>;
    // async findAll(wbsId: number): Promise<Task[]>;
    async findByWbsId(wbsId: number): Promise<Task[]> {
        return this.findActiveByWbsId(wbsId);
    }

    /** 有効タスクのみ（論理削除を除外）。表示・集計・EVM・geppoマッピング等の通常用途。 */
    async findActiveByWbsId(wbsId: number): Promise<Task[]> {
        return this.findAllInternal(wbsId, false);
    }

    /** 論理削除済みを含む全タスク。syncの照合用・replaceAllの全削除用。 */
    async findIncludingDeletedByWbsId(wbsId: number): Promise<Task[]> {
        return this.findAllInternal(wbsId, true);
    }

    async findAll(wbsId?: number): Promise<Task[]> {
        return this.findAllInternal(wbsId, false);
    }

    private async findAllInternal(wbsId?: number, includeDeleted = false): Promise<Task[]> {
        const whereClause = {
            ...(wbsId ? { wbsId: wbsId } : {}),
            ...(includeDeleted ? {} : { isDeleted: false }),
        };
        const tasksDb = await prisma.wbsTask.findMany({
            where: whereClause,
            include: {
                assignee: {
                    include: {
                        assignee: true
                    }
                },
                phase: true,
                periods: {
                    include: {
                        kosus: true,
                    },
                },
            },
        });

        const workRecordsDb = await prisma.workRecord.findMany({
            where: {
                taskId: {
                    in: tasksDb.map(task => task.id),
                },
            },
        });
        return tasksDb.map(taskDb => Task.createFromDb({
            id: taskDb.id,
            taskNo: TaskNo.reconstruct(taskDb.taskNo),
            name: taskDb.name,
            wbsId: taskDb.wbsId,
            assigneeId: taskDb.assigneeId ?? undefined,
            assignee: taskDb.assignee ? Assignee.createFromDb({
                id: taskDb.assignee.id,
                name: taskDb.assignee.assignee.name,
                displayName: taskDb.assignee.assignee.displayName,
            }) : undefined,
            phaseId: taskDb.phaseId ?? undefined,
            phase: taskDb.phase ? Phase.createFromDb({
                id: taskDb.phase.id,
                name: taskDb.phase.name,
                code: new PhaseCode(taskDb.phase.code),
                seq: taskDb.phase.seq,
            }) : undefined,
            periods: taskDb.periods.map(period => Period.createFromDb({
                id: period.id,
                startDate: period.startDate,
                endDate: period.endDate,
                type: new PeriodType({ type: period.type }),
                manHours: period.kosus.map(kosu => ManHour.createFromDb({
                    id: kosu.id,
                    kosu: Number(kosu.kosu),
                    type: new ManHourType({ type: kosu.type }),
                })),
            })),
            workRecords:
                workRecordsDb
                    .filter(workRecordDb => workRecordDb.taskId === taskDb.id)
                    .map(workRecordDb =>
                        WorkRecord.createFromDb({
                            id: workRecordDb.id,
                            userId: workRecordDb.userId,
                            taskId: workRecordDb.taskId!,
                            startDate: workRecordDb.date,
                            endDate: workRecordDb.date,
                            manHours: Number(workRecordDb.hours_worked),
                        })
                    ),
            status: new TaskStatus({ status: taskDb.status }),
            progressRate: taskDb.progressRate ? Number(taskDb.progressRate) : undefined,
            createdAt: taskDb.createdAt,
            updatedAt: taskDb.updatedAt,
        }));
    }

    async create(task: Task): Promise<Task> {
        console.log("repository: create")
        const taskDb = await prisma.wbsTask.create({
            data: {
                taskNo: task.taskNo?.getValue(),
                name: task.name,
                wbsId: task.wbsId,
                assigneeId: task.assigneeId ?? undefined,
                phaseId: task.phaseId ?? undefined,
                status: task.status.status,
                progressRate: task.progressRate,
            },
        });

        for (const period of task.periods ?? []) {
            const periodDb = await prisma.taskPeriod.create({
                data: {
                    taskId: taskDb.id,
                    startDate: period.startDate,
                    endDate: period.endDate,
                    type: period.type.type,
                },
            });

            for (const manHour of period.manHours) {
                await prisma.taskKosu.create({
                    data: {
                        periodId: periodDb.id,
                        kosu: Number(manHour.kosu),
                        type: manHour.type.type,
                        wbsId: task.wbsId,
                    },
                });
            }
        }

        console.log("taskDb", taskDb)
        return Task.createFromDb({
            id: taskDb.id,
            taskNo: TaskNo.reconstruct(taskDb.taskNo),
            name: taskDb.name,
            wbsId: taskDb.wbsId,
            phaseId: taskDb.phaseId ?? undefined,
            assigneeId: taskDb.assigneeId ?? undefined,
            status: new TaskStatus({ status: taskDb.status }),
        });
    }

    async update(wbsId: number, task: Task): Promise<Task> {
        console.log("repository: update")

        // 本体更新＋期間・工数の入れ替えを単一トランザクションで実行する。
        // 期間・工数は upsert(id ?? 0) だと毎回createに落ちて重複蓄積するため、
        // 既存をdeleteMany（TaskKosuはonDelete:Cascadeで連動削除）してから再createする。
        const taskDb = await prisma.$transaction(async (tx) => {
            const updated = await tx.wbsTask.update({
                where: { id: task.id, wbsId: wbsId },
                data: {
                    name: task.name,
                    assigneeId: task.assigneeId ?? undefined,
                    phaseId: task.phaseId ?? undefined,
                    status: task.status.status,
                    progressRate: task.progressRate,
                },
            });

            // 既存の期間・工数を全入れ替え（重複蓄積を防ぐ）
            await this.replacePeriodsTx(tx, task.id!, wbsId, task.periods ?? []);

            return updated;
        });

        return Task.createFromDb({
            id: taskDb.id,
            taskNo: TaskNo.reconstruct(taskDb.taskNo),
            name: task.name,
            wbsId: task.wbsId,
            assigneeId: task.assigneeId ?? undefined,
            status: new TaskStatus({ status: task.status.status }),
        });
    }

    /**
     * タスクの期間・工数をトランザクション内で全入れ替えする共通処理。
     * 既存 TaskPeriod を deleteMany（TaskKosu は Cascade で連動削除）してから再create。
     */
    private async replacePeriodsTx(
        tx: TxClient,
        taskId: number,
        wbsId: number,
        periods: Task["periods"]
    ): Promise<void> {
        await tx.taskPeriod.deleteMany({ where: { taskId } });
        for (const period of periods ?? []) {
            const periodDb = await tx.taskPeriod.create({
                data: {
                    taskId,
                    startDate: period.startDate,
                    endDate: period.endDate,
                    type: period.type.type,
                },
            });
            for (const manHour of period.manHours) {
                await tx.taskKosu.create({
                    data: {
                        periodId: periodDb.id,
                        wbsId,
                        kosu: Number(manHour.kosu),
                        type: manHour.type.type,
                    },
                });
            }
        }
    }

    async findSyncStateByWbsId(wbsId: number): Promise<TaskSyncState[]> {
        const rows = await prisma.wbsTask.findMany({
            where: { wbsId },
            select: { id: true, taskNo: true, isDeleted: true },
        });
        return rows.map(r => ({ id: r.id, taskNo: r.taskNo, isDeleted: r.isDeleted }));
    }

    async applySyncDiff(
        wbsId: number,
        buckets: SyncDiffBuckets,
        now: Date,
        context?: SyncDiffContext
    ): Promise<{ syncLogId: number | null }> {
        const { toCreate, toUpdate, toSoftDeleteIds } = buckets;

        const syncLogId = await prisma.$transaction(async (tx) => {
            // context あり時は先頭で SyncLog を採番（snapshotのsyncLogId FK用）
            let createdSyncLogId: number | null = null;
            if (context) {
                const log = await tx.syncLog.create({ data: context.syncLogData });
                createdSyncLogId = log.id;
            }

            // 新規作成（taskNo→新id を控える）
            const createdIdByTaskNo = new Map<string, number>();
            for (const task of toCreate) {
                const created = await tx.wbsTask.create({
                    data: {
                        taskNo: task.taskNo?.getValue(),
                        name: task.name,
                        wbsId: task.wbsId,
                        assigneeId: task.assigneeId ?? undefined,
                        phaseId: task.phaseId ?? undefined,
                        status: task.status.status,
                        progressRate: task.progressRate,
                    },
                });
                if (task.taskNo) createdIdByTaskNo.set(task.taskNo.getValue(), created.id);
                await this.replacePeriodsTx(tx, created.id, wbsId, task.periods ?? []);
            }

            // 存続/復活（id保持）。reviveは isDeleted=false/deletedAt=null を内包。
            for (const task of toUpdate) {
                await tx.wbsTask.update({
                    where: { id: task.id, wbsId },
                    data: {
                        name: task.name,
                        // Excelは差分同期の唯一の真実源。値が無いnullableは undefined（=変更しない）ではなく
                        // 明示的にクリアする（担当者/進捗を外したときに古い値が残らないようにする）。
                        assigneeId: task.assigneeId ?? null,
                        phaseId: task.phaseId ?? null,
                        status: task.status.status,
                        progressRate: task.progressRate ?? 0, // 未設定は0（@default(0)・create挙動に一致）
                        isDeleted: false,
                        deletedAt: null,
                    },
                });
                await this.replacePeriodsTx(tx, task.id!, wbsId, task.periods ?? []);
            }

            // 消失（有効タスクのみ論理削除。既存tombstoneは where で除外）
            if (toSoftDeleteIds.length > 0) {
                await tx.wbsTask.updateMany({
                    where: { id: { in: toSoftDeleteIds }, isDeleted: false },
                    data: { isDeleted: true, deletedAt: now },
                });
            }

            // スナップショット追記（同一tx・同一syncLogId）
            if (context && createdSyncLogId !== null && context.snapshotInputs.length > 0) {
                const rows = context.snapshotInputs.map((s) => {
                    // 新規タスクは create 結果の id を taskNo で解決
                    const taskId = s.taskId ?? createdIdByTaskNo.get(s.taskNo);
                    if (taskId === undefined) {
                        throw new Error(`スナップショットのtaskId解決に失敗しました: taskNo=${s.taskNo}`);
                    }
                    return {
                        taskId,
                        wbsId,
                        taskNo: s.taskNo,
                        snapshotAt: context.snapshotAt,
                        progressRate: s.progressRate,
                        status: s.status as $Enums.TaskStatus,
                        plannedManHours: s.plannedManHours,
                        baseManHours: s.baseManHours,
                        costPerHour: s.costPerHour,
                        plannedStart: s.plannedStart,
                        plannedEnd: s.plannedEnd,
                        baseStart: s.baseStart,
                        baseEnd: s.baseEnd,
                        actualStart: s.actualStart,
                        actualEnd: s.actualEnd,
                        isRemoved: s.isRemoved,
                        syncLogId: createdSyncLogId,
                    };
                });
                await tx.taskProgressSnapshot.createMany({ data: rows });
            }

            return createdSyncLogId;
        });

        return { syncLogId };
    }

    async replaceAllTasks(
        wbsId: number,
        tasks: Task[]
    ): Promise<{ deleted: number; added: number }> {
        return prisma.$transaction(
            async (tx) => {
                // 既存タスク数（tombstone含む）を記録
                const deleted = await tx.wbsTask.count({ where: { wbsId } });

                // 全タスク削除（TaskPeriod/Kosu/DependencyはDB FK Cascade、
                // WorkRecordはSetNull、TaskStatusLogはRestrict→違反時はtx全体ロールバック）
                await tx.wbsTask.deleteMany({ where: { wbsId } });

                // 孤児化する進捗スナップショット履歴をtx内でクリア（失敗時は保持される）
                await tx.taskProgressSnapshot.deleteMany({ where: { wbsId } });

                // 新タスクを作成
                for (const task of tasks) {
                    const created = await tx.wbsTask.create({
                        data: {
                            taskNo: task.taskNo?.getValue(),
                            name: task.name,
                            wbsId: task.wbsId,
                            assigneeId: task.assigneeId ?? undefined,
                            phaseId: task.phaseId ?? undefined,
                            status: task.status.status,
                            progressRate: task.progressRate,
                        },
                    });
                    await this.replacePeriodsTx(tx, created.id, wbsId, task.periods ?? []);
                }

                return { deleted, added: tasks.length };
            },
            { timeout: 30000, maxWait: 30000 }
        );
    }

    async delete(id: number): Promise<void> {
        await prisma.wbsTask.delete({
            where: { id },
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async findTasksByPeriod(startDate: Date, endDate: Date): Promise<Task[]> {

        // TODO: 未実装
        return [];
    }
}