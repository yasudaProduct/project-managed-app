import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import type { ITaskRepository } from '@/applications/task/itask-repository'
import type { ITaskMappingService, TaskMappingEntry } from '@/applications/geppo-import/itask-mapping-service'
import { buildTaskMapKey } from '@/applications/geppo-import/itask-mapping-service'
import { Task } from '@/domains/task/task'

@injectable()
export class TaskMappingService implements ITaskMappingService {
  constructor(
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository
  ) { }

  async createTaskMap(entries: TaskMappingEntry[]): Promise<Map<string, number>> {
    const taskMap = new Map<string, number>()

    try {
      const uniqueWbsIds = [...new Set(entries.map(e => e.wbsId))]
      const tasksByWbsId = new Map<number, Task[]>()
      for (const wbsId of uniqueWbsIds) {
        tasksByWbsId.set(wbsId, await this.taskRepository.findByWbsId(wbsId))
      }

      for (const { projectId, wbsNo, wbsId } of entries) {
        if (!projectId || !wbsNo) continue

        const tasks = tasksByWbsId.get(wbsId) ?? []
        const matched = tasks.find(t => t.taskNo.getValue() === wbsNo)

        if (matched) {
          taskMap.set(buildTaskMapKey(projectId, wbsNo), matched.id!)
        } else {
          console.warn(`Task mapping not found: projectId=${projectId} wbsNo=${wbsNo} wbsId=${wbsId}`)
        }
      }

      return taskMap
    } catch (error) {
      console.error('Failed to create task map:', error)
      throw new Error('タスクマッピングの作成に失敗しました')
    }
  }

  async validateTaskMapping(entries: TaskMappingEntry[]): Promise<{
    totalTasks: number
    mappedTasks: number
    unmappedTasks: string[]
    mappingRate: number
  }> {
    try {
      const filtered = entries.filter(e => e.projectId && e.wbsNo)
      const taskMap = await this.createTaskMap(filtered)
      const unmappedTasks = filtered
        .filter(e => !taskMap.has(buildTaskMapKey(e.projectId, e.wbsNo)))
        .map(e => e.wbsNo)

      return {
        totalTasks: filtered.length,
        mappedTasks: taskMap.size,
        unmappedTasks,
        mappingRate: filtered.length > 0 ? taskMap.size / filtered.length : 0
      }
    } catch (error) {
      console.error('Failed to validate task mapping:', error)
      throw new Error('タスクマッピング検証に失敗しました')
    }
  }
}
