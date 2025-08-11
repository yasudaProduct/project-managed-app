import { TaskDependency } from "@/domains/task-dependency/task-dependency";

describe('TaskDependency', () => {
    describe('create', () => {
        test('正常な値で依存関係を作成できる', () => {
            const dependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            expect(dependency.predecessorTaskId).toBe(1);
            expect(dependency.successorTaskId).toBe(2);
            expect(dependency.wbsId).toBe(1);
        });

        test('先行タスクと後続タスクが同じ場合はエラーになる', () => {
            expect(() => {
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 1,
                    wbsId: 1
                });
            }).toThrow('タスクは自分自身に依存できません');
        });

        test('無効な先行タスクIDでエラーになる', () => {
            expect(() => {
                TaskDependency.create({
                    predecessorTaskId: 0,
                    successorTaskId: 2,
                    wbsId: 1
                });
            }).toThrow('無効なタスクIDです');

            expect(() => {
                TaskDependency.create({
                    predecessorTaskId: -1,
                    successorTaskId: 2,
                    wbsId: 1
                });
            }).toThrow('無効なタスクIDです');
        });

        test('無効な後続タスクIDでエラーになる', () => {
            expect(() => {
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 0,
                    wbsId: 1
                });
            }).toThrow('無効なタスクIDです');
        });

        test('無効なWBSIDでエラーになる', () => {
            expect(() => {
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 2,
                    wbsId: 0
                });
            }).toThrow('無効なWBSIDです');
        });
    });

    describe('createFromDb', () => {
        test('DBからのデータで依存関係を作成できる', () => {
            const now = new Date();
            const dependency = TaskDependency.createFromDb({
                id: 1,
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1,
                createdAt: now,
                updatedAt: now
            });

            expect(dependency.id).toBe(1);
            expect(dependency.predecessorTaskId).toBe(1);
            expect(dependency.successorTaskId).toBe(2);
            expect(dependency.wbsId).toBe(1);
            expect(dependency.createdAt).toBe(now);
            expect(dependency.updatedAt).toBe(now);
        });
    });

    describe('isEqual', () => {
        test('同じ依存関係の場合はtrueを返す', () => {
            const dependency1 = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            const dependency2 = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            expect(dependency1.isEqual(dependency2)).toBe(true);
        });

        test('異なる依存関係の場合はfalseを返す', () => {
            const dependency1 = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            const dependency2 = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 3,
                wbsId: 1
            });

            expect(dependency1.isEqual(dependency2)).toBe(false);
        });
    });

    describe('isDuplicate', () => {
        test('重複する依存関係がある場合はtrueを返す', () => {
            const dependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            const existingDependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            expect(dependency.isDuplicate([existingDependency])).toBe(true);
        });

        test('重複する依存関係がない場合はfalseを返す', () => {
            const dependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            const existingDependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 3,
                wbsId: 1
            });

            expect(dependency.isDuplicate([existingDependency])).toBe(false);
        });

        test('空の配列の場合はfalseを返す', () => {
            const dependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            expect(dependency.isDuplicate([])).toBe(false);
        });
    });
});