import { WbsTask } from "@/types/wbs";
import { Card, CardContent } from "../ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

interface WbsSummaryCardProps {
  wbsId: number;
  wbsTasks: WbsTask[];
}

export default function WbsSummaryCard({
  wbsId,
  wbsTasks,
}: WbsSummaryCardProps) {
  // 工程ごとの集計
  const phaseAggregates = wbsTasks.reduce((acc, task) => {
    const phaseName = task.phase?.name || "未分類";
    if (!acc[phaseName]) {
      acc[phaseName] = { kijunKosu: 0, yoteiKosu: 0, jissekiKosu: 0 };
    }
    acc[phaseName].kijunKosu += task.kijunKosu || 0;
    acc[phaseName].yoteiKosu += task.yoteiKosu || 0;
    acc[phaseName].jissekiKosu += task.jissekiKosu || 0;
    return acc;
  }, {} as Record<string, { kijunKosu: number; yoteiKosu: number; jissekiKosu: number }>);

  return (
    <div className="my-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>工程別集計</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        工程名
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        基準工数
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        予定工数
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        実績工数
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(phaseAggregates).map(
                      ([phaseName, kosu]) => (
                        <tr key={phaseName}>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {phaseName}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {kosu.kijunKosu}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {kosu.yoteiKosu}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {kosu.jissekiKosu}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
