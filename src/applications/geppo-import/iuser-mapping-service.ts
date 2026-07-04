export interface IUserMappingService {
  createUserMap(geppoMemberIds: string[]): Promise<Map<string, string>>;
  validateUserMapping(geppoMemberIds: string[]): Promise<{
    totalUsers: number;
    mappedUsers: number;
    unmappedUsers: string[];
    mappingRate: number;
  }>;
}
