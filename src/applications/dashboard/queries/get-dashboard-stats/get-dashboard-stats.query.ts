import { Query } from "@/applications/shared/cqrs/base-classes";

export class GetDashboardStatsQuery extends Query {
    constructor(
        public readonly userId?: string,
        public readonly dateRange?: { from: Date; to: Date }
    ) {
        super();
    }
}