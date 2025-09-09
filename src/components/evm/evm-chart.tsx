'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EvmChartProps {
  cumulativeMetrics: Array<{
    date: string;
    cumulativePv: number;
    cumulativeEv: number;
    cumulativeAc: number;
  }>;
  title?: string;
  height?: number;
  showLegend?: boolean;
}

export function EvmChart({ 
  cumulativeMetrics, 
  title = 'EVM Chart', 
  height = 300,
  showLegend = true 
}: EvmChartProps) {
  if (!cumulativeMetrics || cumulativeMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        EVMデータがありません
      </div>
    );
  }

  const chartData = cumulativeMetrics.map(metric => ({
    date: new Date(metric.date).toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    }),
    PV: metric.cumulativePv,
    EV: metric.cumulativeEv,
    AC: metric.cumulativeAc
  }));

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: '工数', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)} 時間`,
              name === 'PV' ? '計画値 (PV)' : 
              name === 'EV' ? '出来高 (EV)' : '実績値 (AC)'
            ]}
            labelFormatter={(label) => `日付: ${label}`}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => 
                value === 'PV' ? '計画値 (PV)' : 
                value === 'EV' ? '出来高 (EV)' : '実績値 (AC)'
              }
            />
          )}
          <Line
            type="monotone"
            dataKey="PV"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            name="PV"
          />
          <Line
            type="monotone"
            dataKey="EV"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            name="EV"
          />
          <Line
            type="monotone"
            dataKey="AC"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            name="AC"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}