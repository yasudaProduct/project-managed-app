import { TaskDependency } from "@/domains/task-dependency/task-dependency";
import { TaskDependencyValidator } from "@/domains/task-dependency/task-dependency-validator";

describe('TaskDependencyValidator', () => {
    describe('hasCyclicDependency', () => {
        test('循環参照がない場合はfalseを返す', () => {
            const existingDependencies = [
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 2,
                    wbsId: 1
                }),
                TaskDependency.create({
                    predecessorTaskId: 2,
                    successorTaskId: 3,
                    wbsId: 1
                })
            ];

            const newDependency = TaskDependency.create({
                predecessorTaskId: 3,
                successorTaskId: 4,
                wbsId: 1
            });

            const result = TaskDependencyValidator.hasCyclicDependency(
                newDependency,
                existingDependencies
            );

            expect(result).toBe(false);
        });

        test('直接的な循環参照がある場合はtrueを返す', () => {
            const existingDependencies = [
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 2,
                    wbsId: 1
                })
            ];

            const newDependency = TaskDependency.create({
                predecessorTaskId: 2,
                successorTaskId: 1,
                wbsId: 1
            });

            const result = TaskDependencyValidator.hasCyclicDependency(
                newDependency,
                existingDependencies
            );

            expect(result).toBe(true);
        });

        test('間接的な循環参照がある場合はtrueを返す', () => {
            const existingDependencies = [
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 2,
                    wbsId: 1
                }),
                TaskDependency.create({
                    predecessorTaskId: 2,
                    successorTaskId: 3,
                    wbsId: 1
                })
            ];

            const newDependency = TaskDependency.create({
                predecessorTaskId: 3,
                successorTaskId: 1,
                wbsId: 1
            });

            const result = TaskDependencyValidator.hasCyclicDependency(
                newDependency,
                existingDependencies
            );

            expect(result).toBe(true);
        });

        test('複雑な循環参照がある場合はtrueを返す', () => {
            const existingDependencies = [
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 2,
                    wbsId: 1
                }),
                TaskDependency.create({
                    predecessorTaskId: 2,
                    successorTaskId: 3,
                    wbsId: 1
                }),
                TaskDependency.create({
                    predecessorTaskId: 3,
                    successorTaskId: 4,
                    wbsId: 1
                }),
                TaskDependency.create({
                    predecessorTaskId: 4,
                    successorTaskId: 5,
                    wbsId: 1
                })
            ];

            const newDependency = TaskDependency.create({
                predecessorTaskId: 5,
                successorTaskId: 2,
                wbsId: 1
            });

            const result = TaskDependencyValidator.hasCyclicDependency(
                newDependency,
                existingDependencies
            );

            expect(result).toBe(true);
        });

        test('既存の依存関係がない場合はfalseを返す', () => {
            const newDependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            const result = TaskDependencyValidator.hasCyclicDependency(
                newDependency,
                []
            );

            expect(result).toBe(false);
        });
    });

    describe('validate', () => {
        const tasksInSameWbs = [1, 2, 3, 4, 5];

        test('正常な依存関係は検証を通る', () => {
            const dependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1
            });

            const existingDependencies = [
                TaskDependency.create({
                    predecessorTaskId: 3,
                    successorTaskId: 4,
                    wbsId: 1
                })
            ];

            expect(() => {
                TaskDependencyValidator.validate(
                    dependency,
                    existingDependencies,
                    tasksInSameWbs
                );
            }).not.toThrow();
        });

        test('同一WBS内にない先行タスクでエラーになる', () => {
            const dependency = TaskDependency.create({
                predecessorTaskId: 10, // WBS内にないタスク
                successorTaskId: 2,
                wbsId: 1
            });

            expect(() => {
                TaskDependencyValidator.validate(
                    dependency,
                    [],
                    tasksInSameWbs
                );
            }).toThrow('先行タスクが同一WBS内に存在しません');
        });

        test('同一WBS内にない後続タスクでエラーになる', () => {
            const dependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 10, // WBS内にないタスク
                wbsId: 1
            });

            expect(() => {
                TaskDependencyValidator.validate(
                    dependency,
                    [],
                    tasksInSameWbs
                );
            }).toThrow('後続タスクが同一WBS内に存在しません');
        });

        test('重複する依存関係でエラーになる', () => {
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

            expect(() => {
                TaskDependencyValidator.validate(
                    dependency,
                    [existingDependency],
                    tasksInSameWbs
                );
            }).toThrow('同じ依存関係が既に存在します');
        });

        test('循環参照でエラーになる', () => {
            const existingDependencies = [
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 2,
                    wbsId: 1
                })
            ];

            const dependency = TaskDependency.create({
                predecessorTaskId: 2,
                successorTaskId: 1,
                wbsId: 1
            });

            expect(() => {
                TaskDependencyValidator.validate(
                    dependency,
                    existingDependencies,
                    tasksInSameWbs
                );
            }).toThrow('循環参照が発生するため、この依存関係は設定できません');
        });
    });

    describe('canRemoveDependency', () => {
        test('依存関係は削除可能', () => {
            const result = TaskDependencyValidator.canRemoveDependency();
            expect(result).toBe(true);
        });
    });
});