import { Card, CardContent } from "@/components/ui/card";
import { listPortfolio } from "./actions";
import { PortfolioTable } from "./_components/portfolio-table";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const rows = await listPortfolio();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ポートフォリオ</h1>
        <p className="text-gray-600 mt-1">
          未開始・進行中プロジェクトの最新WBSを、危ない順（ヘルス→SPIの低い順）に一覧表示します
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <PortfolioTable rows={rows} />
          <p className="mt-4 text-xs text-gray-500">
            値は工数（h）で、測定方式・予測方式・ヘルス判定のしきい値は各プロジェクトの設定に従います。遅れタスクと入力漏れの判定は各プロジェクト画面と同じです。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
