import { Query } from "@/applications/shared/cqrs/base-classes";
import { AllocationCalculationMode } from "./allocation-calculation-mode";

export class GetWbsSummaryQuery extends Query {
  constructor(
    public readonly projectId: string,
    public readonly wbsId: number,
    public readonly calculationMode: AllocationCalculationMode = AllocationCalculationMode.BUSINESS_DAY_ALLOCATION
  ) {
    super();
  }
}