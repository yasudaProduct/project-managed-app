import { WbsTag } from "@/domains/wbs/wbs-tag";

describe('WbsTag', () => {
  describe('create', () => {
    it('WBSタグを作成できること', () => {
      const tag = WbsTag.create({
        wbsId: 1,
        name: 'WEB新規'
      });

      expect(tag).toBeInstanceOf(WbsTag);
      expect(tag.id).toBeUndefined();
      expect(tag.wbsId).toBe(1);
      expect(tag.name).toBe('WEB新規');
    });

    it('タグ名が空の場合はエラーになること', () => {
      expect(() => {
        WbsTag.create({
          wbsId: 1,
          name: ''
        });
      }).toThrow('タグ名は必須です');
    });

    it('タグ名が空白のみの場合はエラーになること', () => {
      expect(() => {
        WbsTag.create({
          wbsId: 1,
          name: '   '
        });
      }).toThrow('タグ名は必須です');
    });
  });

  describe('createFromDb', () => {
    it('DBからのデータでWBSタグを作成できること', () => {
      const tag = WbsTag.createFromDb({
        id: 1,
        wbsId: 1,
        name: 'DBリプレイス'
      });

      expect(tag).toBeInstanceOf(WbsTag);
      expect(tag.id).toBe(1);
      expect(tag.wbsId).toBe(1);
      expect(tag.name).toBe('DBリプレイス');
    });
  });

  describe('isEqual', () => {
    it('同じWBSIDとタグ名を持つタグは等しいと判定されること', () => {
      const tag1 = WbsTag.create({ wbsId: 1, name: 'WEB新規' });
      const tag2 = WbsTag.create({ wbsId: 1, name: 'WEB新規' });

      expect(tag1.isEqual(tag2)).toBe(true);
    });

    it('異なるタグ名を持つタグは等しくないと判定されること', () => {
      const tag1 = WbsTag.create({ wbsId: 1, name: 'WEB新規' });
      const tag2 = WbsTag.create({ wbsId: 1, name: 'DBリプレイス' });

      expect(tag1.isEqual(tag2)).toBe(false);
    });

    it('異なるWBSIDを持つ同名タグは等しくないと判定されること', () => {
      const tag1 = WbsTag.create({ wbsId: 1, name: 'WEB新規' });
      const tag2 = WbsTag.create({ wbsId: 2, name: 'WEB新規' });

      expect(tag1.isEqual(tag2)).toBe(false);
    });
  });
});
