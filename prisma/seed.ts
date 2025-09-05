import { assigneeGanttMonthlyTestData, importTestData, importTestData2, mockData, mockDataProjects } from "../src/data/mock-data";
import { phases } from "../src/data/phases";
import { users } from "../src/data/users";
import prisma from "../src/lib/prisma";
import { ProjectStatus, TaskStatus, BufferType, CompanyHolidayType } from "@prisma/client";

async function main() {
    console.log("▶️シードデータの挿入を開始します");

    // 初期データ挿入
    for (const user of users.users) {
        await prisma.users.upsert({
            where: { id: user.id },
            update: {
                name: user.name,
                email: user.email,
                displayName: user.displayName,
            },
            create: {
                id: user.id,
                name: user.name,
                email: user.email,
                displayName: user.displayName,
            },
        })
    }

    for (const userSchedule of users.userSchedules) {
        await prisma.userSchedule.upsert({
            where: { id: userSchedule.id },
            create: {
                id: userSchedule.id,
                userId: userSchedule.userId,
                date: new Date(userSchedule.date),
                startTime: userSchedule.startTime,
                endTime: userSchedule.endTime,
                title: userSchedule.title,
                location: userSchedule.location,
                description: userSchedule.description,
            },
            update: {
                userId: userSchedule.userId,
                date: userSchedule.date,
                startTime: userSchedule.startTime,
                endTime: userSchedule.endTime,
                title: userSchedule.title,
                location: userSchedule.location,
                description: userSchedule.description,
            },
        })
    }

    for (const phase of phases) {
        await prisma.phaseTemplate.upsert({
            where: { id: phase.id },
            update: {
                name: phase.name,
                code: phase.code,
                seq: phase.seq,
            },
            create: {
                id: phase.id,
                name: phase.name,
                code: phase.code,
                seq: phase.seq,
            },
        })
    }

    for (const project of mockDataProjects) {
        await prisma.projects.upsert({
            where: { id: project.id.toString() },
            update: {
                name: project.name,
                status: project.status as ProjectStatus,
                description: project.description,
                startDate: project.startDate,
                endDate: project.endDate,
            },
            create: {
                id: project.id.toString(),
                name: project.name,
                status: project.status as ProjectStatus,
                description: project.description,
                startDate: project.startDate,
                endDate: project.endDate,
            },
        })
    }

    const mocks = [
        mockData,
        importTestData,
        importTestData2,
        //mockDataLarge,
        assigneeGanttMonthlyTestData,
    ]

    for (const mock of mocks) {
        // モックデータ挿入
        await prisma.projects.upsert({
            where: { id: mock.project.id.toString() },
            update: {
                name: mock.project.name,
                status: mock.project.status as ProjectStatus,
                description: mock.project.description,
                startDate: mock.project.startDate,
                endDate: mock.project.endDate,
            },
            create: {
                id: mock.project.id.toString(),
                name: mock.project.name,
                status: mock.project.status as ProjectStatus,
                description: mock.project.description,
                startDate: mock.project.startDate,
                endDate: mock.project.endDate,
            },
        })

        for (const wbs of mock.wbs) {
            const wbsId = (wbs.id ?? stableId(`${wbs.projectId}:${wbs.name}`));
            await prisma.wbs.upsert({
                where: { id: wbsId },
                update: {
                    name: wbs.name,
                    projectId: wbs.projectId.toString(),
                },
                create: {
                    id: wbsId,
                    name: wbs.name,
                    projectId: wbs.projectId.toString(),
                },
            })
        }

        const phaseIdByCodeSeq = new Map<string, number>();
        const phaseIdByCode = new Map<string, number>();
        for (const phase of mock.wbsPhase) {
            const phaseAny = phase as any;
            const phaseId = (phaseAny.id ?? stableId(`${phase.wbsId}:${phase.code}:${phase.seq ?? ''}`));
            await prisma.wbsPhase.upsert({
                where: { id: phaseId },
                update: {
                    wbsId: phase.wbsId,
                    name: phase.name,
                    code: phase.code,
                    seq: phase.seq,
                },
                create: {
                    id: phaseId,
                    wbsId: phase.wbsId,
                    name: phase.name,
                    code: phase.code,
                    seq: phase.seq,
                },
            })
            const keyWithSeq = `${phase.wbsId}:${phase.code}:${phase.seq ?? ''}`;
            phaseIdByCodeSeq.set(keyWithSeq, phaseId);
            const keyCodeOnly = `${phase.wbsId}:${phase.code}`;
            if (!phaseIdByCode.has(keyCodeOnly)) {
                phaseIdByCode.set(keyCodeOnly, phaseId);
            }
        }

        for (const assignee of mock.wbsAssignee) {
            const assigneeAny = assignee as any;
            const wbsAssigneeId = (assigneeAny.id ?? stableId(`${assignee.wbsId}:${assignee.assigneeId}`));
            await prisma.wbsAssignee.upsert({
                where: { id: wbsAssigneeId },
                update: {
                    wbsId: assignee.wbsId,
                    assigneeId: assignee.assigneeId,
                },
                create: {
                    id: wbsAssigneeId,
                    wbsId: assignee.wbsId,
                    assigneeId: assignee.assigneeId,
                },
            })
        }

        for (const task of mock.wbsTask) {
            const tAny = task as any;
            const taskId = (tAny.id ?? stableId(`${task.wbsId}:${task.taskNo}`));
            let resolvedPhaseId: number | undefined = tAny.phaseId;
            if (!resolvedPhaseId && tAny.phaseCode) {
                if (tAny.phaseSeq !== undefined) {
                    resolvedPhaseId = phaseIdByCodeSeq.get(`${task.wbsId}:${tAny.phaseCode}:${tAny.phaseSeq ?? ''}`);
                } else {
                    resolvedPhaseId = phaseIdByCode.get(`${task.wbsId}:${tAny.phaseCode}`);
                }
            }
            const resolvedAssigneeId = (tAny.assigneeId ?? (tAny.assigneeUserId ? stableId(`${task.wbsId}:${tAny.assigneeUserId}`) : undefined));

            const taskData = await prisma.wbsTask.upsert({
                where: { taskNo_wbsId: { taskNo: task.taskNo, wbsId: task.wbsId } },
                update: {
                    wbsId: task.wbsId,
                    phaseId: resolvedPhaseId!,
                    name: task.name,
                    assigneeId: resolvedAssigneeId!,
                    status: task.status as TaskStatus,
                },
                create: {
                    taskNo: task.taskNo,
                    wbsId: task.wbsId,
                    phaseId: resolvedPhaseId!,
                    name: task.name,
                    assigneeId: resolvedAssigneeId!,
                    status: task.status as TaskStatus,
                },
            })

            const taskPeriod = await prisma.taskPeriod.upsert({
                where: { id: taskData.id },
                update: {
                    taskId: taskData.id,
                    startDate: task.startDate,
                    endDate: task.endDate,
                    type: 'YOTEI',
                },
                create: {
                    taskId: taskData.id,
                    startDate: task.startDate,
                    endDate: task.endDate,
                    type: 'YOTEI'
                },
            })

            await prisma.taskKosu.upsert({
                where: { id: taskPeriod.id },
                update: {
                    kosu: task.kosu,
                },
                create: {
                    wbsId: task.wbsId,
                    periodId: taskPeriod.id,
                    kosu: task.kosu,
                    type: 'NORMAL',
                },
            })
        }

        for (const buffer of mock.wbsBuffer) {
            const bufferAny = buffer as any;
            const bufferId = (bufferAny.id ?? stableId(`${buffer.wbsId}:${buffer.name}:${buffer.bufferType}`));
            await prisma.wbsBuffer.upsert({
                where: { id: bufferId },
                update: {
                    wbsId: buffer.wbsId,
                    name: buffer.name,
                    buffer: buffer.buffer,
                    bufferType: buffer.bufferType as BufferType,
                },
                create: {
                    id: bufferId,
                    wbsId: buffer.wbsId,
                    name: buffer.name,
                    buffer: buffer.buffer,
                    bufferType: buffer.bufferType as BufferType,
                },
            })
        }

        for (const milestone of mock.milestone) {
            const d = new Date(milestone.date);
            const milestoneAny = milestone as any;
            const milestoneId = (milestoneAny.id ?? stableId(`${milestone.wbsId}:${milestone.name}:${d.toISOString().slice(0,10)}`));
            await prisma.milestone.upsert({
                where: { id: milestoneId },
                update: {
                    wbsId: milestone.wbsId,
                    name: milestone.name,
                    date: d,
                },
                create: {
                    id: milestoneId,
                    wbsId: milestone.wbsId,
                    name: milestone.name,
                    date: d,
                },
            })
        }

        for (const workRecord of mock.workRecords) {
            const d = new Date(workRecord.date);
            const wrAny = workRecord as any;
            const workRecordId = (wrAny.id ?? stableId(`${workRecord.userId}:${workRecord.taskId}:${d.toISOString().slice(0,10)}`));
            await prisma.workRecord.upsert({
                where: { id: workRecordId },
                update: {
                    userId: workRecord.userId,
                    taskId: workRecord.taskId,
                    date: d,
                    hours_worked: workRecord.hours_worked,
                },
                create: {
                    id: workRecordId,
                    userId: workRecord.userId,
                    taskId: workRecord.taskId,
                    date: d,
                    hours_worked: workRecord.hours_worked,
                },
            })
        }

        for (const companyHoliday of mock.companyHolidays) {
            const d = new Date(companyHoliday.date);
            const chAny = companyHoliday as any;
            const companyHolidayId = (chAny.id ?? stableId(`${d.toISOString().slice(0,10)}:${companyHoliday.name}:${companyHoliday.type}`));
            await prisma.companyHoliday.upsert({
                where: { 
                    id: companyHolidayId,
                },
                update: {
                    name: companyHoliday.name,
                    type: companyHoliday.type as CompanyHolidayType,
                },
                create: {
                    id: companyHolidayId,
                    date: d,
                    name: companyHoliday.name,
                    type: companyHoliday.type as CompanyHolidayType,
                },
            })
        }

        for (const userSchedule of mock.userSchedules) {
            const d = new Date(userSchedule.date);
            const usAny = userSchedule as any;
            const userScheduleId = (usAny.id ?? stableId(`${userSchedule.userId}:${d.toISOString().slice(0,10)}:${userSchedule.startTime}:${userSchedule.endTime}:${userSchedule.title}`));
            await prisma.userSchedule.upsert({
                where: { id: userScheduleId },
                update: {
                    userId: userSchedule.userId,
                    date: d,
                    startTime: userSchedule.startTime,
                    endTime: userSchedule.endTime,
                    title: userSchedule.title,
                    location: userSchedule.location,
                    description: userSchedule.description,
                },
                create: {
                    id: userScheduleId,
                    userId: userSchedule.userId,
                    date: d,
                    startTime: userSchedule.startTime,
                    endTime: userSchedule.endTime,
                    title: userSchedule.title,
                    location: userSchedule.location,
                    description: userSchedule.description,
                },
            })
        }
    }


    // 自動採番テーブルのシーケンスを MAX(id)+1 に再調整（PostgreSQL）
    // 空テーブルは次回の nextval が 1 になるように第3引数を false、
    // レコードがある場合は MAX(id) の次から始まるよう true を渡す
    const autoIncrementTables = [
        "wbs",
        "wbs_assignee",
        "wbs_phase",
        "phase_template",
        "wbs_buffer",
        "wbs_task",
        "task_period",
        "task_kosu",
        "task_status_log",
        "milestone",
        "work_records",
        "user_schedule",
        "wbs_progress_history",
        "task_progress_history",
        "company_holidays",
    ] as const;

    for (const tableName of autoIncrementTables) {
        try {
            // pg_get_serial_sequence で対象テーブルのシーケンス名を取得し、
            // MAX(id) をもとに setval を設定する
            const sql = `SELECT setval(
                pg_get_serial_sequence('"${tableName}"', 'id'),
                COALESCE(MAX(id), 1),
                COALESCE(MAX(id), 0) <> 0
            ) FROM "${tableName}";`;
            await prisma.$executeRawUnsafe(sql);
            console.log(`🔧 シーケンス再調整: ${tableName}`);
        } catch (e) {
            console.warn(`⚠️ シーケンス再調整に失敗: ${tableName}`, e);
        }
    }

    console.log("✅シードデータの挿入とシーケンス再調整が完了しました");

}

/**
 * 文字列を32ビットの正の整数に変換する
 * @param input 
 * @returns
 */
function stableId(input: string): number {
    let h = 2166136261; // FNV-1a 32bit
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    // 32bit 符号付きINT範囲(1..2,147,483,647)に収める
    const unsigned = (h >>> 0);
    const signedPositive = (unsigned & 0x7fffffff);
    return signedPositive || 1;
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });