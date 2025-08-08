"use client";

import { useState } from "react";
import { ProjectWbsList } from "./project-wbs-list";
import { WbsInfoPanel } from "../wbs/wbs-info-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, List } from "lucide-react";

interface WbsItem {
  id: number;
  name: string;
  projectId: string;
}

interface ProjectDetailClientProps {
  wbsList: WbsItem[];
  projectId: string;
}

export function ProjectDetailClient({
  wbsList,
  projectId,
}: ProjectDetailClientProps) {
  const [selectedWbs, setSelectedWbs] = useState<WbsItem | null>(null);

  return (
    <Tabs defaultValue="list" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="list" className="flex items-center gap-2">
          <List className="h-4 w-4" />
          WBS一覧
        </TabsTrigger>
        <TabsTrigger value="gantt" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          ガントチャート
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* WBS List */}
          <div className="lg:col-span-2">
            <ProjectWbsList
              wbsList={wbsList}
              projectId={projectId}
              onWbsSelect={setSelectedWbs}
              selectedWbsId={selectedWbs?.id || null}
            />
          </div>

          {/* WBS Info Panel */}
          <div>
            <WbsInfoPanel selectedWbs={selectedWbs} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="gantt" className="mt-6">
        <div className="flex items-center justify-center min-h-[400px] border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">
            ガントチャート機能は近日公開予定です
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
