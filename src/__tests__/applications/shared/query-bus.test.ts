import { QueryBus } from '@/applications/shared/query-bus/query-bus';
import { Query } from '@/applications/shared/cqrs/base-classes';

/**
 * QueryBus はクエリのクラスそのものでハンドラを引く。
 * 本番ビルドではクラス名が圧縮されて別々のクエリが同じ名前（例: "e"）になるため、
 * 名前をキーにすると登録が衝突する（next build で "Handler for e is already registered"）。
 */
describe('QueryBus', () => {
  // 圧縮後の状態を再現するため、同じ名前の別クラスを2つ作る
  const makeSameNameQueryClass = () => class SameNameQuery extends Query {};

  it('同じ名前の別クラスでも別々に登録・実行できる', async () => {
    const bus = new QueryBus();
    const QueryA = makeSameNameQueryClass();
    const QueryB = makeSameNameQueryClass();
    expect(QueryA.name).toBe(QueryB.name);

    bus.register(QueryA, { execute: async () => 'A' });
    bus.register(QueryB, { execute: async () => 'B' });

    await expect(bus.execute(new QueryA())).resolves.toBe('A');
    await expect(bus.execute(new QueryB())).resolves.toBe('B');
  });

  it('同じクラスを二重に登録するとエラー', () => {
    const bus = new QueryBus();
    const QueryA = makeSameNameQueryClass();
    bus.register(QueryA, { execute: async () => 'A' });

    expect(() => bus.register(QueryA, { execute: async () => 'A2' })).toThrow(
      'Handler for SameNameQuery is already registered'
    );
  });

  it('未登録のクエリを実行するとエラー', async () => {
    const bus = new QueryBus();
    const QueryA = makeSameNameQueryClass();

    await expect(bus.execute(new QueryA())).rejects.toThrow(
      'No handler registered for query SameNameQuery'
    );
  });
});
