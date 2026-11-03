import { Query } from "@/applications/shared/cqrs/base-classes";

/** 見積精度（完了タスクの実績 / 基準）をプロジェクト横断で集計する */
export class GetEstimationAccuracyQuery extends Query {
  constructor() {
    super();
  }
}
