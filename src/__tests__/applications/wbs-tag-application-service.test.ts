import { WbsTagApplicationService } from "@/applications/wbs/wbs-tag-application-service";
import { IWbsTagRepository } from "@/applications/wbs/iwbs-tag-repository";
import { WbsTag } from "@/domains/wbs/wbs-tag";

describe('WbsTagApplicationService', () => {
  let service: WbsTagApplicationService;
  let mockRepository: jest.Mocked<IWbsTagRepository>;

  beforeEach(() => {
    mockRepository = {
      findByWbsId: jest.fn(),
      findAllDistinctNames: jest.fn(),
      addTag: jest.fn(),
      removeTag: jest.fn(),
      findWbsIdsByTagNames: jest.fn(),
    };

    service = new WbsTagApplicationService(mockRepository);
  });

  describe('getTagsByWbsId', () => {
    it('WBSに紐づくタグを取得できること', async () => {
      const tags = [
        WbsTag.createFromDb({ id: 1, wbsId: 1, name: 'WEB新規' }),
        WbsTag.createFromDb({ id: 2, wbsId: 1, name: 'EC構築' }),
      ];
      mockRepository.findByWbsId.mockResolvedValue(tags);

      const result = await service.getTagsByWbsId(1);

      expect(mockRepository.findByWbsId).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('WEB新規');
      expect(result[1].name).toBe('EC構築');
    });
  });

  describe('getAllTagNames', () => {
    it('全タグ名の候補一覧を取得できること', async () => {
      mockRepository.findAllDistinctNames.mockResolvedValue(['WEB新規', 'DBリプレイス', 'インフラ構築']);

      const result = await service.getAllTagNames();

      expect(mockRepository.findAllDistinctNames).toHaveBeenCalled();
      expect(result).toEqual(['WEB新規', 'DBリプレイス', 'インフラ構築']);
    });
  });

  describe('addTag', () => {
    it('WBSにタグを追加できること', async () => {
      const tag = WbsTag.createFromDb({ id: 1, wbsId: 1, name: 'WEB新規' });
      mockRepository.addTag.mockResolvedValue(tag);

      const result = await service.addTag(1, 'WEB新規');

      expect(mockRepository.addTag).toHaveBeenCalledWith(1, 'WEB新規');
      expect(result.name).toBe('WEB新規');
    });

    it('タグ名が空の場合はエラーになること', async () => {
      await expect(service.addTag(1, '')).rejects.toThrow('タグ名は必須です');
      expect(mockRepository.addTag).not.toHaveBeenCalled();
    });

    it('タグ名が空白のみの場合はエラーになること', async () => {
      await expect(service.addTag(1, '   ')).rejects.toThrow('タグ名は必須です');
      expect(mockRepository.addTag).not.toHaveBeenCalled();
    });
  });

  describe('removeTag', () => {
    it('WBSからタグを削除できること', async () => {
      mockRepository.removeTag.mockResolvedValue();

      await service.removeTag(1, 'WEB新規');

      expect(mockRepository.removeTag).toHaveBeenCalledWith(1, 'WEB新規');
    });
  });
});
