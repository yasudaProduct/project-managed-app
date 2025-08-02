// CQRSベースクラス

export interface IQuery {
    readonly timestamp: Date;
}

export interface IQueryHandler<TQuery extends IQuery, TResult> {
    execute(query: TQuery): Promise<TResult>;
}

export interface IQueryBus {
    execute<TResult>(query: IQuery): Promise<TResult>;
}

export abstract class Query implements IQuery {
    readonly timestamp: Date;

    constructor() {
        this.timestamp = new Date();
    }
}