"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import type { FindingsByReviewee } from "@/applications/quality/quality-application.service";

interface Props {
  data: FindingsByReviewee[];
}

export function QualityRevieweeFindingsChart({ data }: Props) {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          レビューイ別指摘数
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            指摘がありません。
          </div>
        ) : (
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 16, bottom: 48, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="revieweeName"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="指摘数" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
