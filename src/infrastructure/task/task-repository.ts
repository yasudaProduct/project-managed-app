import { ITaskRepository } from '@/domains/task/task-repository';
import prisma from '@/lib/prisma';

export class TaskRepository implements ITaskRepository {
    public async findMaxSequenceNumber(wbsId: number, phaseCode: string): Promise<number> {
        const tasks = await prisma.wbsTask.findMany({
            where: {
                wbsId: wbsId,
                phase: {
                    code: phaseCode
                }
            },
            select: {
                id: true
            }
        });

        if (tasks.length === 0) {
            return 0;
        }

        const sequenceNumbers = tasks.map(task => {
            const match = task.id.match(/^[A-Z]+-(\d{4})$/);
            return match ? parseInt(match[1]) : 0;
        });

        return Math.max(...sequenceNumbers);
    }
} 