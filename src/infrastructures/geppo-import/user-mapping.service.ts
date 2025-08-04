import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import type { IUserRepository } from '@/applications/user/iuser-repositroy'

@injectable()
export class UserMappingService {
  constructor(
    @inject(SYMBOL.IUserRepository) private userRepository: IUserRepository
  ) { }

  async createUserMap(geppoMemberIds: string[]): Promise<Map<string, string>> {
    const userMap = new Map<string, string>()

    try {
      // 1. 既存ユーザーを取得
      const existingUsers = await this.userRepository.findAll()

      // 2. geppo.MEMBER_ID と users.id でマッピング
      for (const memberId of geppoMemberIds) {
        const matchedUser = existingUsers.find(u =>
          u.id === memberId ||                   // 完全一致
          u.email.startsWith(memberId)           // メールアドレスプレフィックス一致
        )

        if (matchedUser) {
          userMap.set(memberId, matchedUser.id)
        } else {
          console.warn(`User mapping not found: ${memberId}`)
        }
      }

      return userMap
    } catch (error) {
      console.error('Failed to create user map:', error)
      throw new Error('ユーザーマッピングの作成に失敗しました')
    }
  }

  async validateUserMapping(geppoMemberIds: string[]): Promise<{
    totalUsers: number
    mappedUsers: number
    unmappedUsers: string[]
    mappingRate: number
  }> {
    try {
      const userMap = await this.createUserMap(geppoMemberIds)
      const unmappedUsers = geppoMemberIds.filter(id => !userMap.has(id))

      return {
        totalUsers: geppoMemberIds.length,
        mappedUsers: userMap.size,
        unmappedUsers,
        mappingRate: geppoMemberIds.length > 0 ? userMap.size / geppoMemberIds.length : 0
      }
    } catch (error) {
      console.error('Failed to validate user mapping:', error)
      throw new Error('ユーザーマッピング検証に失敗しました')
    }
  }
}