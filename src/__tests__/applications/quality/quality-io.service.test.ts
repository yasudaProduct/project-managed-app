import {
  parseFindingRows,
  parseSizeRows,
  parseTestProgressRows,
  parseTargetAttributeRows,
  toTsv,
  escapeTsv,
} from '@/applications/quality/quality-io.service';
import { FindingSource, QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';

describe('quality-io.service', () => {
  describe('parseFindingRows（拡張版）', () => {
    it('新フィールド（injectionPhase, phenomenonType, causeType）をパースする', () => {
      const result = parseFindingRows([
        {
          taskNo: 'T-001',
          source: 'REVIEW',
          category: 'ロジック',
          injectionPhase: '基本設計',
          phenomenonType: 'アベンド',
          causeType: '単純ミス',
          description: '条件分岐の誤り',
          foundAt: '2026-04-01',
        },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].injectionPhase).toBe('基本設計');
      expect(result.rows[0].phenomenonType).toBe('アベンド');
      expect(result.rows[0].causeType).toBe('単純ミス');
    });

    it('新フィールドは省略可能', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', foundAt: '2026-04-01' },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].injectionPhase).toBeUndefined();
      expect(result.rows[0].phenomenonType).toBeUndefined();
      expect(result.rows[0].causeType).toBeUndefined();
    });

    it('sourceの日本語変換が正しい', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', source: 'テスト', foundAt: '2026-04-01' },
        { taskNo: 'T-002', source: 'レビュー', foundAt: '2026-04-01' },
      ]);

      expect(result.rows[0].source).toBe(FindingSource.TEST);
      expect(result.rows[1].source).toBe(FindingSource.REVIEW);
    });

    it('source省略時はデフォルトREVIEW', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', foundAt: '2026-04-19' },
      ]);
      expect(result.rows[0].source).toBe(FindingSource.REVIEW);
    });

    it('taskNoが空の場合はエラー', () => {
      const result = parseFindingRows([
        { taskNo: '', foundAt: '2026-04-01' },
      ]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('taskNo');
    });

    it('不正な日付はエラー', () => {
      const result = parseFindingRows([
        { taskNo: 'T-001', foundAt: 'invalid' },
      ]);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('parseSizeRows', () => {
    it('LOC単位をパースできる', () => {
      const result = parseSizeRows([
        { taskNo: 'T-001', unit: 'LOC', value: '5000', measuredAt: '2026-04-01' },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].unit).toBe(QualitySizeUnit.LOC);
    });

    it('FP単位をパースできる', () => {
      const result = parseSizeRows([
        { taskNo: 'T-001', unit: 'FP', value: '100', measuredAt: '2026-04-01' },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].unit).toBe(QualitySizeUnit.FP);
    });

    it('PAGE単位をパースできる', () => {
      const result = parseSizeRows([
        { taskNo: 'T-001', unit: 'PAGE', value: 10, measuredAt: '2026-04-19', note: 'メモ' },
      ]);
      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].unit).toBe(QualitySizeUnit.PAGE);
      expect(result.rows[0].value).toBe(10);
    });

    it('不正なunitはエラー', () => {
      const result = parseSizeRows([
        { taskNo: 'T-001', unit: 'INVALID', value: '100', measuredAt: '2026-04-01' },
      ]);
      expect(result.errors).toHaveLength(1);
    });

    it('0以下の値はエラー', () => {
      const result = parseSizeRows([
        { taskNo: 'T-001', unit: 'PAGE', value: 0, measuredAt: '2026-04-19' },
      ]);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('parseTestProgressRows', () => {
    it('テスト進捗行をパースする', () => {
      const result = parseTestProgressRows([
        {
          taskNo: 'T-001',
          date: '2026-04-01',
          plannedTotal: '100',
          executedTotal: '50',
          passedTotal: '45',
          failedTotal: '5',
          blockedTotal: '0',
        },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].taskNo).toBe('T-001');
      expect(result.rows[0].plannedTotal).toBe(100);
      expect(result.rows[0].executedTotal).toBe(50);
      expect(result.rows[0].passedTotal).toBe(45);
      expect(result.rows[0].failedTotal).toBe(5);
      expect(result.rows[0].blockedTotal).toBe(0);
    });

    it('taskNoが空の場合はエラー', () => {
      const result = parseTestProgressRows([
        { taskNo: '', date: '2026-04-01', plannedTotal: '100', executedTotal: '50', passedTotal: '45', failedTotal: '5', blockedTotal: '0' },
      ]);
      expect(result.errors).toHaveLength(1);
    });

    it('数値が不正な場合はエラー', () => {
      const result = parseTestProgressRows([
        { taskNo: 'T-001', date: '2026-04-01', plannedTotal: 'abc', executedTotal: '50', passedTotal: '45', failedTotal: '5', blockedTotal: '0' },
      ]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('plannedTotal');
    });

    it('負の値はエラー', () => {
      const result = parseTestProgressRows([
        { taskNo: 'T-001', date: '2026-04-01', plannedTotal: '-1', executedTotal: '50', passedTotal: '45', failedTotal: '5', blockedTotal: '0' },
      ]);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('parseTargetAttributeRows', () => {
    it('評価対象属性をパースする', () => {
      const result = parseTargetAttributeRows([
        { taskNo: 'T-001', subsystem: 'ユーザー管理', featureGroup: '認証' },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].taskNo).toBe('T-001');
      expect(result.rows[0].subsystem).toBe('ユーザー管理');
      expect(result.rows[0].featureGroup).toBe('認証');
    });

    it('属性は省略可能', () => {
      const result = parseTargetAttributeRows([
        { taskNo: 'T-001' },
      ]);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].subsystem).toBeUndefined();
      expect(result.rows[0].featureGroup).toBeUndefined();
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
