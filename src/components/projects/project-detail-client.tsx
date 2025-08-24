"use client";

import { useState } from "react";
import { ProjectWbsList } from "./project-wbs-list";
import { WbsInfoPanel } from "./wbs-info-panel";

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
  const [selectedWbs, setSelectedWbs] = useState<WbsItem | null>(wbsList[0]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* WBS List */}
      <div className="lg:col-span-1">
        <ProjectWbsList
          wbsList={wbsList}
          projectId={projectId}
          onWbsSelect={setSelectedWbs}
          selectedWbsId={selectedWbs?.id || null}
        />
      </div>

      {/* WBS Info Panel */}
      <div className="lg:col-span-2">
        <WbsInfoPanel selectedWbs={selectedWbs} />
      </div>
    </div>
  );
}
