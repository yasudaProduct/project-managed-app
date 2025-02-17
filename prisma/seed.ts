import { mockData } from "../src/data/mock-data";
import { phases } from "../src/data/phases";
import { users } from "../src/data/users";
import prisma from "../src/lib/prisma";
import { ProjectStatus, TaskStatus, BufferType } from "@prisma/client";

async function main() {
    console.log("seed start");

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

    // モックデータ挿入
    await prisma.projects.upsert({
        where: { id: mockData.project.id.toString() },
        update: {
            name: mockData.project.name,
            status: mockData.project.status as ProjectStatus,
            description: mockData.project.description,
            startDate: new Date(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        },
        create: {
            id: mockData.project.id.toString(),
            name: mockData.project.name,
            status: mockData.project.status as ProjectStatus,
            description: mockData.project.description,
            startDate: new Date(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
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
        await prisma.wbsTask.upsert({
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
                wbsId: task.wbsId,
                phaseId: task.phaseId,
                name: task.name,
                assigneeId: task.assigneeId,
                status: task.status as TaskStatus,

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
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });