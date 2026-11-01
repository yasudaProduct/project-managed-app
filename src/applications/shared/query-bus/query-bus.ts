import { injectable } from "inversify";
import { IQuery, IQueryBus, IQueryHandler } from "../cqrs/base-classes";

interface QueryHandlerMetadata {
    queryType: new (...args: unknown[]) => IQuery;
    handler: IQueryHandler<IQuery, unknown>;
}

/**
 * クエリのクラスそのものをキーにハンドラを引く。
 * クラス名をキーにすると、本番ビルドで名前が圧縮されて別々のクエリが同じ名前になり衝突する。
 */
@injectable()
export class QueryBus implements IQueryBus {
    private handlers = new Map<abstract new (...args: never[]) => IQuery, QueryHandlerMetadata>();

    register<TQuery extends IQuery, TResult>(
        queryType: new (...args: unknown[]) => TQuery,
        handler: IQueryHandler<TQuery, TResult>
    ): void {
        if (this.handlers.has(queryType)) {
            throw new Error(`Handler for ${queryType.name} is already registered`);
        }

        this.handlers.set(queryType, {
            queryType: queryType as new (...args: unknown[]) => IQuery,
            handler: handler as IQueryHandler<IQuery, unknown>
        });
    }

    async execute<TResult>(query: IQuery): Promise<TResult> {
        const metadata = this.handlers.get(
            query.constructor as abstract new (...args: never[]) => IQuery
        );

        if (!metadata) {
            throw new Error(`No handler registered for query ${query.constructor.name}`);
        }

        return metadata.handler.execute(query) as Promise<TResult>;
    }

    // 一括登録用のヘルパーメソッド
    registerHandlers(handlers: Array<{
        queryType: new (...args: unknown[]) => IQuery;
        handler: IQueryHandler<IQuery, unknown>;
    }>): void {
        handlers.forEach(({ queryType, handler }) => {
            this.register(queryType, handler);
        });
    }
}