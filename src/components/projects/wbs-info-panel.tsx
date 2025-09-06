"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getWbsAssignees,
  getWbsPhases,
} from "@/app/projects/[id]/wbs-detail-actions";

interface Assignee {
  assignee: {
    id: number;
    name: string;
    displayName: string;
  } | null;
  wbsId: number;
}

interface Phase {
  id: number;
  name: string;
  code: string;
}

interface WbsInfoPanelProps {
  selectedWbs: {
    id: number;
    name: string;
    projectId: string;
  } | null;
}

export function WbsInfoPanel({ selectedWbs }: WbsInfoPanelProps) {
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedWbs) {
      setLoading(true);
      Promise.all([
        getWbsAssignees(selectedWbs.id),
        getWbsPhases(selectedWbs.id),
      ])
        .then(([assigneesData, wbsPhasesData]) => {
          setAssignees(assigneesData || []);
          setPhases(wbsPhasesData || []);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setAssignees([]);
      setPhases([]);
    }
  }, [selectedWbs]);

  if (!selectedWbs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">WBS詳細</CardTitle>
          <CardDescription>
            WBSを選択すると詳細情報が表示されます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">WBSを選択してください</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {selectedWbs.name}
        </CardTitle>
        <CardDescription>WBS ID: {selectedWbs.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 w-[50%]">
        {/* アクション */}
        <div className="space-y-2">
          <div className="space-y-2">
            <Link href={`/wbs/${selectedWbs.id}`} className="block">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                WBS詳細を表示
              </Button>
            </Link>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              基本情報
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">WBS名</span>
                <span className="text-sm font-medium">{selectedWbs.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 担当者一覧 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">
              担当者
            </h4>
            <Link href={`/wbs/${selectedWbs.id}/assignee/new`}>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <UserPlus className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {loading ? (
            <div className="text-xs text-muted-foreground">読み込み中...</div>
          ) : assignees.length > 0 ? (
            <div className="space-y-1">
              {assignees.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">
                    {item.assignee?.displayName || "未設定"}
                  </span>
                  {item.assignee && (
                    <Badge variant="secondary" className="text-xs h-5">
                      {item.assignee.name}
                    </Badge>
                  )}
                </div>
              ))}
              {assignees.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  他 {assignees.length - 3} 名
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              担当者が設定されていません
            </div>
          )}
        </div>

        {/* 使用中のフェーズ */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            使用中のフェーズ
          </h4>
          {loading ? (
            <div className="text-xs text-muted-foreground">読み込み中...</div>
          ) : phases.length > 0 ? (
            <div className="space-y-1">
              {phases.slice(0, 3).map((phase) => (
                <div
                  key={phase.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{phase.name}</span>
                  <Badge variant="default" className="text-xs h-5">
                    {phase.code}
                  </Badge>
                </div>
              ))}
              {phases.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  他 {phases.length - 3} 件
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              使用中のフェーズはありません
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
