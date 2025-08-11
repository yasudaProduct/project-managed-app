import { TaskDependency } from "./task-dependency";

export class TaskDependencyValidator {
    /**
     * 循環参照をチェックする
     * @param newDependency 追加しようとする依存関係
     * @param existingDependencies 既存の依存関係一覧
     * @returns 循環参照が発生する場合はtrue
     */
    public static hasCyclicDependency(
        newDependency: TaskDependency,
        existingDependencies: TaskDependency[]
    ): boolean {
        // 新しい依存関係を含めた全体の依存関係
        const allDependencies = [...existingDependencies, newDependency];
        
        // 依存関係のマップを作成
        const dependencyMap = new Map<number, number[]>();
        
        allDependencies.forEach(dep => {
            const predecessorId = dep.predecessorTaskId;
            const successorId = dep.successorTaskId;
            
            if (!dependencyMap.has(predecessorId)) {
                dependencyMap.set(predecessorId, []);
            }
            dependencyMap.get(predecessorId)!.push(successorId);
        });

        // 新しい依存関係の後続タスクから開始して、先行タスクに辿り着けるかチェック
        const visited = new Set<number>();
        const stack: number[] = [newDependency.successorTaskId];

        while (stack.length > 0) {
            const currentTaskId = stack.pop()!;
            
            if (visited.has(currentTaskId)) {
                continue;
            }
            
            visited.add(currentTaskId);
            
            // 新しい依存関係の先行タスクに辿り着いた場合、循環参照
            if (currentTaskId === newDependency.predecessorTaskId) {
                return true;
            }
            
            // 現在のタスクの後続タスクをスタックに追加
            const successors = dependencyMap.get(currentTaskId) || [];
            successors.forEach(successorId => {
                if (!visited.has(successorId)) {
                    stack.push(successorId);
                }
            });
        }

        return false;
    }

    /**
     * 依存関係の妥当性をチェックする
     * @param dependency チェック対象の依存関係
     * @param existingDependencies 既存の依存関係一覧
     * @param tasksInSameWbs 同一WBS内のタスクID一覧
     */
    public static validate(
        dependency: TaskDependency,
        existingDependencies: TaskDependency[],
        tasksInSameWbs: number[]
    ): void {
        // 同一WBS内のタスクかチェック
        if (!tasksInSameWbs.includes(dependency.predecessorTaskId)) {
            throw new Error("先行タスクが同一WBS内に存在しません");
        }
        
        if (!tasksInSameWbs.includes(dependency.successorTaskId)) {
            throw new Error("後続タスクが同一WBS内に存在しません");
        }

        // 重複チェック
        if (dependency.isDuplicate(existingDependencies)) {
            throw new Error("同じ依存関係が既に存在します");
        }

        // 循環参照チェック
        if (this.hasCyclicDependency(dependency, existingDependencies)) {
            throw new Error("循環参照が発生するため、この依存関係は設定できません");
        }
    }

    /**
     * 依存関係の削除が可能かチェックする
     */
    public static canRemoveDependency(): boolean {
        // 現在は特に制約なしで削除可能
        return true;
    }
}