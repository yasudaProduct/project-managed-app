"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";

interface WbsItem {
  id: number;
  name: string;
  projectId: string;
}

interface ProjectWbsListProps {
  wbsList: WbsItem[];
  projectId: string;
  onWbsSelect: (wbs: WbsItem | null) => void;
  selectedWbsId: number | null;
}

export function ProjectWbsList({ wbsList, projectId, onWbsSelect, selectedWbsId }: ProjectWbsListProps) {
  const handleWbsClick = (wbs: WbsItem) => {
    if (selectedWbsId === wbs.id) {
      onWbsSelect(null); // 同じWBSをクリックした場合は選択解除
    } else {
      onWbsSelect(wbs);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            WBS一覧
          </CardTitle>
          <Link href={`/projects/${projectId}/wbs`}>
            <Button variant="outline" size="sm">
              すべて表示
            </Button>
          </Link>
        </div>
        <CardDescription>
          このプロジェクトに関連するWBS構造（クリックで詳細表示）
        </CardDescription>
      </CardHeader>
      <CardContent>
        {wbsList && wbsList.length > 0 ? (
          <div className="space-y-2">
            {wbsList.slice(0, 5).map((wbs) => (
              <div
                key={wbs.id}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedWbsId === wbs.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => handleWbsClick(wbs)}
              >
                <div>
                  <span className="font-medium hover:text-primary transition-colors">
                    {wbs.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWbsId === wbs.id && (
                    <span className="text-xs text-primary font-medium">選択中</span>
                  )}
                  <Link href={`/wbs/${wbs.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      詳細
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {wbsList.length > 5 && (
              <div className="text-center pt-2">
                <Link href={`/projects/${projectId}/wbs`}>
                  <Button variant="link" size="sm">
                    他 {wbsList.length - 5} 件を表示
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">WBSがまだ作成されていません</p>
            <Link
              href={`/projects/${projectId}/wbs/new`}
              className="mt-2 inline-block"
            >
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                最初のWBSを作成
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}