import { getMockData } from "../src/data/mock-data";
import { phases } from "../src/data/phases";
import { users } from "../src/data/users";
import prisma from "../src/lib/prisma";
import { ProjectStatus, TaskStatus, BufferType, CompanyHolidayType } from "@prisma/client";

async function main() {
    console.log("▶️シードデータの挿入を開始します");

    // 初期データ挿入
    for (const user of users) {
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

    const mocks = getMockData()

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

        for (const phase of mock.wbsPhase) {
            await prisma.wbsPhase.upsert({
                where: { id: phase.id },
                update: {
                    wbsId: phase.wbsId,
                    name: phase.name,
                    code: phase.code,
                    seq: phase.seq,
                },
                create: {
                    id: phase.id,
                    wbsId: phase.wbsId,
                    name: phase.name,
                    code: phase.code,
                    seq: phase.seq,
                },
            })
        }

        for (const assignee of mock.wbsAssignee) {
            await prisma.wbsAssignee.upsert({
                where: { id: assignee.id },
                update: {
                    wbsId: assignee.wbsId,
                    assigneeId: assignee.assigneeId,
                    rate: assignee.rate,
                },
                create: {
                    id: assignee.id,
                    wbsId: assignee.wbsId,
                    assigneeId: assignee.assigneeId,
                    rate: assignee.rate,
                },
            })
        }

        for (const task of mock.wbsTask) {
            const taskData = await prisma.wbsTask.upsert({
                where: { taskNo_wbsId: { taskNo: task.taskNo, wbsId: task.wbsId } },
                update: {
                    wbsId: task.wbsId,
                    phaseId: task.phaseId!,
                    name: task.name,
                    status: task.status as TaskStatus,
                },
                create: {
                    taskNo: task.taskNo,
                    wbsId: task.wbsId,
                    phaseId: task.phaseId!,
                    name: task.name,
                    assigneeId: task.assigneeId,
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
            await prisma.wbsBuffer.upsert({
                where: { id: buffer.id },
                update: {
                    wbsId: buffer.wbsId,
                    name: buffer.name,
                    buffer: buffer.buffer,
                    bufferType: buffer.bufferType as BufferType,
                },
                create: {
                    id: buffer.id,
                    wbsId: buffer.wbsId,
                    name: buffer.name,
                    buffer: buffer.buffer,
                    bufferType: buffer.bufferType as BufferType,
                },
            })
        }

        for (const milestone of mock.milestone) {
            const d = new Date(milestone.date);
            await prisma.milestone.upsert({
                where: { id: milestone.id },
                update: {
                    wbsId: milestone.wbsId,
                    name: milestone.name,
                    date: d,
                },
                create: {
                    id: milestone.id,
                    wbsId: milestone.wbsId,
                    name: milestone.name,
                    date: d,
                },
            })
        }

        for (const workRecord of mock.workRecords) {
            const d = new Date(workRecord.date);
            await prisma.workRecord.upsert({
                where: { id: workRecord.id },
                update: {
                    userId: workRecord.userId,
                    taskId: workRecord.taskId,
                    date: d,
                    hours_worked: workRecord.hours_worked,
                },
                create: {
                    id: workRecord.id,
                    userId: workRecord.userId,
                    taskId: workRecord.taskId,
                    date: d,
                    hours_worked: workRecord.hours_worked,
                },
            })
        }

        for (const companyHoliday of mock.companyHolidays) {
            const d = new Date(companyHoliday.date);
            await prisma.companyHoliday.upsert({
                where: {
                    id: companyHoliday.id,
                },
                update: {
                    name: companyHoliday.name,
                    type: companyHoliday.type as CompanyHolidayType,
                },
                create: {
                    id: companyHoliday.id,
                    date: d,
                    name: companyHoliday.name,
                    type: companyHoliday.type as CompanyHolidayType,
                },
            })
        }

        for (const userSchedule of mock.userSchedules) {
            const d = new Date(userSchedule.date);
            await prisma.userSchedule.upsert({
                where: { id: userSchedule.id },
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
                    id: userSchedule.id,
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
 * IDを生成する
 * @param input 
 * @returns 
 */
function stableId(input: string): number {
    let h = 2166136261;
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