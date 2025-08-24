import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Download, Upload, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ProjectStats {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  milestones: number;
  criticalTasks: number;
  avgProgress: number;
}

interface ProjectHeaderProps {
  projectStats: ProjectStats;
  onExport: () => void;
  onImport: () => void;
}

export const ProjectHeader = ({
  projectStats,
  onExport,
  onImport,
}: ProjectHeaderProps) => {
  return (
    <div className="border-b bg-card">
      <div className="px-6">
        <div className="flex items-center justify-between">
          {/* Project Info */}
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-md font-semibold text-foreground">
                {projectStats.projectName}
              </h1>
              <p className="text-sm text-muted-foreground"></p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm">
                  {projectStats.totalTasks} タスク
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  {projectStats.completedTasks} 完了
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm">
                  {projectStats.criticalTasks} クリティカル
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Progress Indicator */}
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-sm">
              <span className="text-sm font-medium">
                {projectStats.avgProgress}%
              </span>
              <Progress value={projectStats.avgProgress} className="w-20 h-2" />
              <Badge
                variant={
                  projectStats.avgProgress > 75 ? "default" : "secondary"
                }
              >
                {projectStats.avgProgress > 75 ? "順調" : "進行中"}
              </Badge>
            </div>

            {/* Action Buttons */}
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  プロジェクト設定
                </DropdownMenuItem>
                <DropdownMenuItem>プロジェクト共有</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>テンプレートとして保存</DropdownMenuItem>
                <DropdownMenuItem>タイムライン印刷</DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};
