import { Query } from "@/applications/shared/cqrs/base-classes";

export class GetWbsSummaryQuery extends Query {
  constructor(
    public readonly projectId: string,
    public readonly wbsId: number
  ) {
    super();
  }
}