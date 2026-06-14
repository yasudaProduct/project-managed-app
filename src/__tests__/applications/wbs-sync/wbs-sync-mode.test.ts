import { resolveWbsSyncMode } from '@/applications/wbs-sync/wbs-sync-mode';

describe('resolveWbsSyncMode', () => {
  it('options未指定なら diff', () => {
    expect(resolveWbsSyncMode(undefined)).toBe('diff');
  });

  it('空optionsなら diff', () => {
    expect(resolveWbsSyncMode({})).toBe('diff');
  });

  it('syncMode=replace なら replace', () => {
    expect(resolveWbsSyncMode({ syncMode: 'replace' })).toBe('replace');
  });

  it('syncMode=diff なら diff', () => {
    expect(resolveWbsSyncMode({ syncMode: 'diff' })).toBe('diff');
  });

  it('不正な文字列値は diff にフォールバック', () => {
    expect(resolveWbsSyncMode({ syncMode: 'foo' })).toBe('diff');
  });

  it('文字列以外の値は diff にフォールバック', () => {
    expect(resolveWbsSyncMode({ syncMode: 123 })).toBe('diff');
    expect(resolveWbsSyncMode({ syncMode: true })).toBe('diff');
  });
});
