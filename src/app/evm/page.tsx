import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EvmChart } from "@/app/evm/_components/evm-chart";
import { EvmProjectList } from "@/app/evm/_components/evm-project-list";
import { EvmSummaryCards } from "@/app/evm/_components/evm-summary-cards";
import { getEvmDashboardData } from "./actions";

export default async function EvmPage() {
  let data;
  let error: string | null = null;

  try {
    data = await getEvmDashboardData();
  } catch (err) {
    error = err instanceof Error ? err.message : "不明なエラーが発生しました";
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>EVMデータが見つかりません。</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">EVM ダッシュボード</h1>
          <Badge variant="outline" className="text-sm">
            {data.overallMetrics.totalProjects} プロジェクト
          </Badge>
        </div>

        {/* サマリーカード */}
        <EvmSummaryCards overallMetrics={data.overallMetrics} />

        {/* 全体チャート */}
        <Card>
          <CardHeader>
            <CardTitle>全プロジェクト EVM 概要</CardTitle>
          </CardHeader>
          <CardContent>
            <EvmChart
              cumulativeMetrics={[]}
              title="全体EVM"
              showLegend={true}
            />
          </CardContent>
        </Card>

        {/* プロジェクト一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>プロジェクト別 EVM ステータス</CardTitle>
          </CardHeader>
          <CardContent>
            <EvmProjectList projects={data.projects} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
