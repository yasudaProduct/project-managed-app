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

  // 各工数タイプの合計を計算
  const totalKosu = Object.values(phaseAggregates).reduce(
    (totals, kosu) => {
      totals.kijunKosu += kosu.kijunKosu;
      totals.yoteiKosu += kosu.yoteiKosu;
      totals.jissekiKosu += kosu.jissekiKosu;
      return totals;
    },
    { kijunKosu: 0, yoteiKosu: 0, jissekiKosu: 0 }
  );

  return (
    <div className="my-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>工程別集計</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent>
                <table className="max-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-bold text-gray-500">
                        工数
                      </th>
                      {Object.keys(phaseAggregates).map((phaseName) => (
                        <th
                          key={phaseName}
                          className="px-4 py-2 text-left text-sm font-bold text-gray-500"
                        >
                          {phaseName}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-left text-sm font-bold text-gray-500">
                        合計
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {["基準工数", "予定工数", "実績工数"].map(
                      (kosuType, index) => (
                        <tr key={kosuType}>
                          <td className="px-4 py-2 text-sm font-bold text-gray-500">
                            {kosuType}
                          </td>
                          {Object.values(phaseAggregates).map((kosu, idx) => (
                            <td
                              key={idx}
                              className="px-4 py-2 text-sm text-gray-500"
                            >
                              {index === 0
                                ? kosu.kijunKosu
                                : index === 1
                                ? kosu.yoteiKosu
                                : kosu.jissekiKosu}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {index === 0
                              ? totalKosu.kijunKosu
                              : index === 1
                              ? totalKosu.yoteiKosu
                              : totalKosu.jissekiKosu}
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
