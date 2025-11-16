'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { TaskEvmDataSerialized } from '@/app/actions/evm/evm-actions';

type TaskEvmTableProps = {
  tasks: TaskEvmDataSerialized[];
  calculationMode: 'hours' | 'cost';
};

export function TaskEvmTable({ tasks, calculationMode }: TaskEvmTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">完了</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500">進行中</Badge>;
      case 'NOT_STARTED':
        return <Badge variant="secondary">未着手</Badge>;
      case 'PENDING':
        return <Badge variant="outline">保留</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatValue = (value: number) => {
    if (calculationMode === 'cost') {
      return `¥${value.toLocaleString()}`;
    }
    return `${value.toFixed(1)}h`;
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    return a.taskNo.localeCompare(b.taskNo);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>タスク別EVM詳細</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">タスクNo</TableHead>
                <TableHead>タスク名</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">計画工数</TableHead>
                <TableHead className="text-right">実績工数</TableHead>
                <TableHead className="text-right">進捗率</TableHead>
                <TableHead className="text-right">出来高</TableHead>
                {calculationMode === 'cost' && (
                  <TableHead className="text-right">単価</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={calculationMode === 'cost' ? 8 : 7}
                    className="text-center text-muted-foreground"
                  >
                    タスクがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedTasks.map((task) => (
                  <TableRow key={task.taskId}>
                    <TableCell className="font-medium">{task.taskNo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {task.taskName}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-right">
                      {task.plannedManHours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right">
                      {task.actualManHours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right">
                      {task.progressRate}%
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatValue(
                        calculationMode === 'cost'
                          ? task.earnedValueCost
                          : task.earnedValue
                      )}
                    </TableCell>
                    {calculationMode === 'cost' && (
                      <TableCell className="text-right">
                        ¥{task.costPerHour.toLocaleString()}/h
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {sortedTasks.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">総タスク数</p>
                <p className="text-lg font-semibold">{sortedTasks.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">完了タスク</p>
                <p className="text-lg font-semibold">
                  {sortedTasks.filter((t) => t.status === 'COMPLETED').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">総計画工数</p>
                <p className="text-lg font-semibold">
                  {sortedTasks
                    .reduce((sum, t) => sum + t.plannedManHours, 0)
                    .toFixed(1)}
                  h
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">総実績工数</p>
                <p className="text-lg font-semibold">
                  {sortedTasks
                    .reduce((sum, t) => sum + t.actualManHours, 0)
                    .toFixed(1)}
                  h
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
