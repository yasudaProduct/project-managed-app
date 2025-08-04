import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import type { ITaskRepository } from '@/applications/task/itask-repository'

@injectable()
export class TaskMappingService {
  constructor(
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository
  ) { }

  async createTaskMap(geppoWbsNos: string[]): Promise<Map<string, number>> {
    const taskMap = new Map<string, number>()

    try {
      // 1. 既存タスクを取得
      const existingTasks = await this.taskRepository.findAll()

      // 2. geppo.WBS_NO と wbs_tasks.code でマッピング
      for (const wbsNo of geppoWbsNos) {
        if (!wbsNo) continue

        const matchedTask = existingTasks.find(t =>
          t.taskNo.getValue() === wbsNo
        )

        if (matchedTask) {
          taskMap.set(wbsNo, matchedTask.id!)
        } else {
          console.warn(`Task mapping not found: ${wbsNo}`)
        }
      }

      return taskMap
    } catch (error) {
      console.error('Failed to create task map:', error)
      throw new Error('タスクマッピングの作成に失敗しました')
    }
  }

  async validateTaskMapping(geppoWbsNos: string[]): Promise<{
    totalTasks: number
    mappedTasks: number
    unmappedTasks: string[]
    mappingRate: number
  }> {
    try {
      const filteredWbsNos = geppoWbsNos.filter(Boolean)
      const taskMap = await this.createTaskMap(filteredWbsNos)
      const unmappedTasks = filteredWbsNos.filter(wbs => !taskMap.has(wbs))

      console.log("--validateTaskMapping--")
      console.log("geppoWbsNos", geppoWbsNos)
      console.log("filteredWbsNos", filteredWbsNos)
      console.log("taskMap", taskMap)
      console.log("unmappedTasks", unmappedTasks.length)
      console.log("--------------------------------")

      return {
        totalTasks: filteredWbsNos.length,
        mappedTasks: taskMap.size,
        unmappedTasks,
        mappingRate: filteredWbsNos.length > 0 ? taskMap.size / filteredWbsNos.length : 0
      }
    } catch (error) {
      console.error('Failed to validate task mapping:', error)
      throw new Error('タスクマッピング検証に失敗しました')
    }
  }
}