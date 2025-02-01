import { phases } from "../src/data/phases";
import { users } from "../src/data/users";
import prisma from "../src/lib/prisma";

async function main() {
    console.log("seed start");

    // 初期データ挿入
    for (const user of users) {
        await prisma.users.upsert({
            where: { id: user.id },
            update: {
                name: user.name,
                email: user.email,
                displayName: user.name,
            },
            create: {
                id: user.id,
                name: user.name,
                email: user.email,
                displayName: user.name,
            },
        })
    }
    console.log("users upserted");

    for (const phase of phases) {
        await prisma.phaseTemplate.upsert({
            where: { id: phase.id },
            update: {
                name: phase.name,
                order: phase.seq,
            },
            create: {
                id: phase.id,
                name: phase.name,
                order: phase.seq,
            },
        })
    }

    // モックデータ挿入
    // await prisma.projects.upsert({
    //     where: { id: mockData.project.id.toString() },
    //     update: {
    //         name: mockData.project.name,
    //         status: mockData.project.status as ProjectStatus,
    //         description: mockData.project.description,
    //         startDate: new Date(),
    //         endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
    //     },
    //     create: {
    //         id: mockData.project.id.toString(),
    //         name: mockData.project.name,
    //         status: mockData.project.status as ProjectStatus,
    //         description: mockData.project.description,
    //         startDate: new Date(),
    //         endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
    //     },
    // })
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });