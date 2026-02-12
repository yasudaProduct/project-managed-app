import { SyncError, SyncErrorType } from '@/domains/sync/ExcelWbs';

describe('SyncError', () => {
  it('エラーメッセージとタイプ、詳細を保持する', () => {
    const error = new SyncError(
      '接続に失敗しました',
      SyncErrorType.CONNECTION_ERROR,
      { host: 'localhost', port: 5432 }
    );

    expect(error.message).toBe('接続に失敗しました');
    expect(error.type).toBe(SyncErrorType.CONNECTION_ERROR);
    expect(error.details).toEqual({ host: 'localhost', port: 5432 });
    expect(error.name).toBe('SyncError');
  });

  it('Errorクラスを継承している', () => {
    const error = new SyncError(
      'バリデーションエラー',
      SyncErrorType.VALIDATION_ERROR,
      {}
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SyncError);
  });

  it('各エラータイプを正しく設定できる', () => {
    const types = [
      SyncErrorType.CONNECTION_ERROR,
      SyncErrorType.VALIDATION_ERROR,
      SyncErrorType.MAPPING_ERROR,
      SyncErrorType.TRANSACTION_ERROR,
    ];

    types.forEach(type => {
      const error = new SyncError('test', type, {});
      expect(error.type).toBe(type);
    });
  });
});
