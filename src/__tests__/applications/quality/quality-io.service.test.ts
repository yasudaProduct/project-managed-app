import { parseFindingRows, parseSizeRows, toTsv, escapeTsv } from '@/applications/quality/quality-io.service';
import { QualitySizeUnit, FindingSource } from '@/domains/quality/value-objects/quality-enums';

describe('quality-io.service', () => {
  describe('parseFindingRows', () => {
    it('正常な行をパースする', () => {
      const result = parseFindingRows([
        {
          taskNo: 'T-001',
          category: 'bug',
          description: '致命的バグ',
          foundAt: '2026-04-19',
        },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].taskNo).toBe('T-001');
      expect(result.rows[0].source).toBe(FindingSource.REVIEW);
    });

    it('sourceを指定できる（英語）', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', source: 'TEST', foundAt: '2026-04-19' },
      ]);
      expect(result.rows[0].source).toBe(FindingSource.TEST);
    });

    it('sourceを指定できる（日本語）', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', source: 'テスト', foundAt: '2026-04-19' },
      ]);
      expect(result.rows[0].source).toBe(FindingSource.TEST);
    });

    it('sourceを指定できる（レビュー日本語）', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', source: 'レビュー', foundAt: '2026-04-19' },
      ]);
      expect(result.rows[0].source).toBe(FindingSource.REVIEW);
    });

    it('source省略時はデフォルトREVIEW', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', foundAt: '2026-04-19' },
      ]);
      expect(result.rows[0].source).toBe(FindingSource.REVIEW);
    });

    it('taskNoが無いとエラー', () => {
      const result = parseFindingRows([
        { taskNo: '', foundAt: '2026-04-19' },
      ]);
      expect(result.errors).toHaveLength(1);
      expect(result.rows).toHaveLength(0);
    });

    it('不正な日付はエラー', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', foundAt: 'invalid' },
      ]);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('parseSizeRows', () => {
    it('正常な行をパースする', () => {
      const result = parseSizeRows([
        {
          taskNo: 'T-001',
          unit: 'PAGE',
          value: 10,
          measuredAt: '2026-04-19',
          note: 'メモ',
        },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].unit).toBe(QualitySizeUnit.PAGE);
      expect(result.rows[0].value).toBe(10);
    });

    it('LOCエイリアスを許容する', () => {
      const result = parseSizeRows([
        { taskNo: 'T-001', unit: 'LOC', value: 100, measuredAt: '2026-04-19' },
      ]);
      expect(result.rows[0].unit).toBe(QualitySizeUnit.LINES_OF_CODE);
    });

    it('0以下の値はエラー', () => {
      const result = parseSizeRows([
        { taskNo: 'T-001', unit: 'PAGE', value: 0, measuredAt: '2026-04-19' },
      ]);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('toTsv', () => {
    it('タブ区切りで結合する', () => {
      const result = toTsv([
        ['a', 'b', 'c'],
        [1, 2, 3],
      ]);
      expect(result).toBe('a\tb\tc\n1\t2\t3');
    });

    it('改行/タブはスペースに置換', () => {
      expect(escapeTsv('a\tb')).toBe('a b');
      expect(escapeTsv('a\nb')).toBe('a b');
    });

    it('null/undefined/空文字を空文字列にする', () => {
      expect(escapeTsv(null)).toBe('');
      expect(escapeTsv(undefined)).toBe('');
    });
  });
});
