import { Query } from "@/applications/shared/cqrs/base-classes";

export class GetWbsTaskSummaryQuery extends Query {
  constructor(
    public readonly wbsId: number
  ) {
    super();
  }
}
