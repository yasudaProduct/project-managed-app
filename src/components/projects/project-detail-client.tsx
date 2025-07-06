"use client";

import { useState } from "react";
import { ProjectWbsList } from "./project-wbs-list";
import { WbsInfoPanel } from "../wbs/wbs-info-panel";

interface WbsItem {
  id: number;
  name: string;
  projectId: string;
}

interface ProjectDetailClientProps {
  wbsList: WbsItem[];
  projectId: string;
}

export function ProjectDetailClient({ wbsList, projectId }: ProjectDetailClientProps) {
  const [selectedWbs, setSelectedWbs] = useState<WbsItem | null>(null);

  return (
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
  );
}