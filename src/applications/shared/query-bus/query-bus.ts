import { injectable } from "inversify";
import { IQuery, IQueryBus, IQueryHandler } from "../cqrs/base-classes";

interface QueryHandlerMetadata {
    queryType: new (...args: unknown[]) => IQuery;
    handler: IQueryHandler<IQuery, unknown>;
}

@injectable()
export class QueryBus implements IQueryBus {
    private handlers = new Map<string, QueryHandlerMetadata>();

    register<TQuery extends IQuery, TResult>(
        queryType: new (...args: unknown[]) => TQuery,
        handler: IQueryHandler<TQuery, TResult>
    ): void {
        const queryName = queryType.name;
        if (this.handlers.has(queryName)) {
            throw new Error(`Handler for ${queryName} is already registered`);
        }
        
        this.handlers.set(queryName, { 
            queryType: queryType as new (...args: unknown[]) => IQuery, 
            handler: handler as IQueryHandler<IQuery, unknown> 
        });
    }

    async execute<TResult>(query: IQuery): Promise<TResult> {
        const queryName = query.constructor.name;
        const metadata = this.handlers.get(queryName);
        
        if (!metadata) {
            throw new Error(`No handler registered for query ${queryName}`);
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