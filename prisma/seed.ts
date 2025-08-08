import { mockData } from "../src/data/mock-data";
import { phases } from "../src/data/phases";
import { users } from "../src/data/users";
import prisma from "../src/lib/prisma";
import { ProjectStatus, TaskStatus, BufferType } from "@prisma/client";

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

    // モックデータ挿入
    await prisma.projects.upsert({
        where: { id: mockData.project.id.toString() },
        update: {
            name: mockData.project.name,
            status: mockData.project.status as ProjectStatus,
            description: mockData.project.description,
            startDate: mockData.project.startDate,
            endDate: mockData.project.endDate,
        },
        create: {
            id: mockData.project.id.toString(),
            name: mockData.project.name,
            status: mockData.project.status as ProjectStatus,
            description: mockData.project.description,
            startDate: mockData.project.startDate,
            endDate: mockData.project.endDate,
        },
    })

    for (const wbs of mockData.wbs) {
        await prisma.wbs.upsert({
            where: { id: wbs.id },
            update: {
                name: wbs.name,
                projectId: wbs.projectId.toString(),
            },
            create: {
                id: wbs.id,
                name: wbs.name,
                projectId: wbs.projectId.toString(),
            },
        })
    }

    for (const phase of mockData.wbsPhase) {
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

    for (const assignee of mockData.wbsAssignee) {
        await prisma.wbsAssignee.upsert({
            where: { id: assignee.id },
            update: {
                wbsId: assignee.wbsId,
                assigneeId: assignee.assigneeId,
            },
            create: {
                wbsId: assignee.wbsId,
                assigneeId: assignee.assigneeId,
            },
        })
    }

    for (const task of mockData.wbsTask) {
        const taskData = await prisma.wbsTask.upsert({
            where: { id: task.id },
            update: {
                wbsId: task.wbsId,
                phaseId: task.phaseId,
                name: task.name,
                assigneeId: task.assigneeId,
                status: task.status as TaskStatus,
            },
            create: {
                id: task.id,
                taskNo: task.taskNo,
                wbsId: task.wbsId,
                phaseId: task.phaseId,
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

    for (const buffer of mockData.wbsBuffer) {
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

    for (const milestone of mockData.milestone) {
        await prisma.milestone.upsert({
            where: { id: milestone.id },
            update: {
                wbsId: milestone.wbsId,
                name: milestone.name,
                date: new Date(milestone.date),
            },
            create: {
                id: milestone.id,
                wbsId: milestone.wbsId,
                name: milestone.name,
                date: new Date(milestone.date),
            },
        })
    }

    for (const workRecord of mockData.workRecords) {
        await prisma.workRecord.upsert({
            where: { id: workRecord.id },
            update: {
                userId: workRecord.userId,
                taskId: workRecord.taskId,
                date: new Date(workRecord.date),
                hours_worked: workRecord.hours_worked,
            },
            create: {
                userId: workRecord.userId,
                taskId: workRecord.taskId,
                date: new Date(workRecord.date),
                hours_worked: workRecord.hours_worked,
            },
        })
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

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });