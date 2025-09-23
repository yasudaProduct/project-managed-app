"use client";

import { Shield, Calendar, Clock, User, Trello } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProjectStatusName } from "@/utils/utils";
import { formatDate } from "@/utils/date-util";
import { ProjectStatus } from "@/types/wbs";

interface ProjectInfoCardProps {
  project: {
    description: string | null;
    status: ProjectStatus;
    startDate: Date;
    endDate: Date;
  };
  phases: Array<{ name: string }>;
  assignees: Array<{ assignee: { displayName: string } | null }> | null;
  buffers: Array<{
    bufferType: string;
    buffer: number;
    name: string;
  }>;
}

export function ProjectInfoCard({
  project,
  phases,
  assignees,
  buffers,
}: ProjectInfoCardProps) {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardContent className="p-6">
        {/* Description */}
        {project.description && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">概要</h3>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
              {project.description}
            </p>
          </div>
        )}

        {/* Project Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-1">
                    プロジェクト状況
                  </p>
                  <Badge variant="outline" className="text-sm">
                    {getProjectStatusName(project.status)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Period */}
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-1">
                    プロジェクト期間
                  </p>
                  <p className="text-gray-700">
                    {formatDate(project.startDate, "YYYY/MM/DD")}
                    <span className="mx-2 text-gray-400">〜</span>
                    {formatDate(project.endDate, "YYYY/MM/DD")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Phases */}
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Trello className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    工程
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {phases.map((phase, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm px-3 py-1"
                      >
                        {phase.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Assignees */}
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    担当者
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {assignees?.map((assignee, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-sm px-3 py-1"
                      >
                        {assignee.assignee?.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buffers */}
        {buffers.length > 0 && (
          <div className="mt-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-3">
                  バッファ
                </p>
                <div className="space-y-2">
                  {buffers.map((buffer, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg border border-amber-100"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-gray-700">
                          {buffer.bufferType}:
                        </span>
                        <span className="text-gray-600">{buffer.buffer}</span>
                        <span className="text-sm text-gray-500">
                          ({buffer.name})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
