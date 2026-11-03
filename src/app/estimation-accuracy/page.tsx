import { getEstimationAccuracy } from "./actions";
import { EstimationAccuracyTable } from "./_components/estimation-accuracy-table";

export const dynamic = "force-dynamic";

export default async function EstimationAccuracyPage() {
  const result = await getEstimationAccuracy();
  const totalRatio = result.total?.actualToBaselineRatio ?? null;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">見積精度</h1>
        <p className="text-gray-600 mt-1">
          完了タスクの実績工数を基準工数と比べ、どの工程で見積がずれやすいかを示します（中止以外のプロジェクトの最新WBSが対象）
        </p>
        {result.total && (
          <p className="mt-2 text-sm text-gray-700">
            全体: 完了タスク {result.total.taskCount}件 / 実績 / 基準{" "}
            {totalRatio !== null ? `${(totalRatio * 100).toFixed(1)}%` : "—"}
          </p>
        )}
      </div>
      <EstimationAccuracyTable title="工程テンプレート別（プロジェクト横断）" rows={result.byPhaseTemplate} />
      <EstimationAccuracyTable title="プロジェクト × 工程別" rows={result.byProjectPhase} />
      <p className="text-xs text-gray-500">
        基準工数は基準（KIJUN）の工数で、基準が未設定のタスクは予定工数で代用します。実績工数はタスクに紐付く作業実績の合計です。工程テンプレートが未設定の工程は工程名でまとめます。
      </p>
    </div>
  );
}
