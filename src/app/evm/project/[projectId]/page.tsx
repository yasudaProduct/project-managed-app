import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { EvmChart } from "@/app/evm/_components/evm-chart";
import Link from "next/link";
import { getProjectEvmData } from "../../evm-actions";

interface PageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectEvmPage({ params }: PageProps) {
  const { projectId } = await params;

  let data;
  let error: string | null = null;

  try {
    // URLエンコードされたプロジェクトIDをデコード

    data = await getProjectEvmData(decodeURIComponent(projectId));
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
          <AlertDescription>
            プロジェクトEVMデータが見つかりません。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getHealthStatusColor = (status: "healthy" | "warning" | "critical") => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const getHealthStatusText = (status: "healthy" | "warning" | "critical") => {
    switch (status) {
      case "healthy":
        return "良好";
      case "warning":
        return "注意";
      case "critical":
        return "危険";
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
  };

  const getPerformanceIcon = (value: number, threshold = 1) => {
    return value >= threshold ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4">
          <Link href="/evm">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div className="flex items-center justify-between flex-1">
            <div>
              <h1 className="text-3xl font-bold">{data.projectName}</h1>
              <p className="text-gray-500">プロジェクトID: {data.projectId}</p>
            </div>
            <Badge
              className={getHealthStatusColor(data.overallHealthStatus)}
              variant="outline"
            >
              {getHealthStatusText(data.overallHealthStatus)}
            </Badge>
          </div>
        </div>

        {/* サマリーカード */}
        {data.latestMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  コスト差異 (CV)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data.latestMetrics.costVariance)}h
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  {getPerformanceIcon(data.latestMetrics.costVariance, 0)}
                  <span className="ml-1">EV - AC</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  スケジュール差異 (SV)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data.latestMetrics.scheduleVariance)}h
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  {getPerformanceIcon(data.latestMetrics.scheduleVariance, 0)}
                  <span className="ml-1">EV - PV</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  コスト効率 (CPI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.latestMetrics.costPerformanceIndex.toFixed(2)}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  {getPerformanceIcon(data.latestMetrics.costPerformanceIndex)}
                  <span className="ml-1">EV / AC</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  スケジュール効率 (SPI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.latestMetrics.schedulePerformanceIndex.toFixed(2)}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  {getPerformanceIcon(
                    data.latestMetrics.schedulePerformanceIndex
                  )}
                  <span className="ml-1">EV / PV</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* EVMチャート */}
        <Card>
          <CardHeader>
            <CardTitle>EVM 進捗チャート</CardTitle>
          </CardHeader>
          <CardContent>
            <EvmChart
              cumulativeMetrics={data.cumulativeMetrics}
              title=""
              height={400}
              showLegend={true}
            />
          </CardContent>
        </Card>

        {/* 詳細情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* プロジェクト基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                プロジェクト情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">総予算 (BAC)</span>
                <span>{formatNumber(data.budgetAtCompletion)} 時間</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">進捗率</span>
                <span>{data.completionPercentage.toFixed(1)}%</span>
              </div>
              {data.estimatedCompletionDate && (
                <div className="flex justify-between">
                  <span className="font-medium">完了予測日</span>
                  <span>
                    {new Date(data.estimatedCompletionDate).toLocaleDateString(
                      "ja-JP"
                    )}
                  </span>
                </div>
              )}
              {data.latestMetrics && (
                <div className="flex justify-between">
                  <span className="font-medium">最終更新</span>
                  <span>
                    {new Date(data.latestMetrics.date).toLocaleDateString(
                      "ja-JP"
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最新メトリクス */}
          {data.latestMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>最新メトリクス</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-blue-600">計画値 (PV)</span>
                  <span>{formatNumber(data.latestMetrics.pv)} 時間</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-green-600">
                    出来高 (EV)
                  </span>
                  <span>{formatNumber(data.latestMetrics.ev)} 時間</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-red-600">実績値 (AC)</span>
                  <span>{formatNumber(data.latestMetrics.ac)} 時間</span>
                </div>
                <hr />
                <div className="flex justify-between">
                  <span className="font-medium">完了時総コスト予測 (EAC)</span>
                  <span>
                    {formatNumber(data.latestMetrics.estimateAtCompletion)} 時間
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">完了まで残コスト (ETC)</span>
                  <span>
                    {formatNumber(data.latestMetrics.estimateToComplete)} 時間
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
