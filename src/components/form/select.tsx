"use client";

import { ControllerRenderProps } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useEffect, useState } from "react";
import { getWbsPhases } from "@/app/wbs/[id]/wbs-phase-actions";
import { getWbsAssignees } from "@/app/wbs/assignee/assignee-actions";
import { getTaskStatusName } from "@/lib/utils";
import { getPhaseTemplates } from "@/app/wbs/phase/phase-actions";

type SelectPhasesProp = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any, string>;
  wbsId?: number;
};

type Phase = {
  id: number;
  name: string;
  seq: number;
};

const phasesCache: Record<number | string, Phase[]> = {};

export default function SelectPhases({ field, wbsId }: SelectPhasesProp) {
  const [phases, setPhases] = useState<Phase[] | undefined>(
    wbsId && phasesCache[wbsId] ? phasesCache[wbsId] : undefined
  );

  useEffect(() => {
    const key = wbsId ?? "all";
    if (phasesCache[key]) {
      setPhases(phasesCache[key]);
      return;
    }

    const fetchPhases = async () => {
      if (key === "all") {
        const phases = await getPhaseTemplates();
        setPhases(
          phases.map((phase) => ({
            id: phase.id,
            name: phase.name,
            seq: phase.seq,
          }))
        );
      } else {
        const phases = await getWbsPhases(key);
        setPhases(phases);
      }
    };

    fetchPhases();
  }, [wbsId]);

  return (
    <Select
      onValueChange={field.onChange}
      defaultValue={field.value.toString()}
    >
      <SelectTrigger className="col-span-3">
        <SelectValue placeholder="フェーズ" />
      </SelectTrigger>
      <SelectContent>
        {phases ? (
          phases.length > 0 ? (
            phases.map((phase) => (
              <SelectItem key={phase.id} value={phase.id.toString()}>
                {phase.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="nothing" disabled>
              工程を追加してください。
            </SelectItem>
          )
        ) : (
          <SelectItem value="loading" disabled>
            読み込み中...
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

type SelectAssigneeProp = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any, string>;
  wbsId?: number;
};

export function SelectAssignee({ field, wbsId }: SelectAssigneeProp) {
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>();

  useEffect(() => {
    const fetchAssignees = async () => {
      if (wbsId) {
        const result = await getWbsAssignees(wbsId);
        if (result) {
          const assignees = result
            .filter((a) => a.assignee !== null)
            .map((a) => {
              return {
                id: a.assignee!.id.toString(),
                name: a.assignee!.displayName,
              };
            });
          setAssignees(assignees);
        }
      } else {
        // TODO wbsIdがない場合は、全ての担当者を取得する
        // const assignees = await getAssignees();
        // setAssignees(assignees);
      }
    };
    fetchAssignees();
  }, [wbsId]);

  return (
    <Select
      onValueChange={field.onChange}
      defaultValue={field.value.toString()}
    >
      <SelectTrigger className="col-span-3">
        <SelectValue placeholder="担当者" />
      </SelectTrigger>
      <SelectContent>
        {assignees ? (
          assignees.length > 0 ? (
            assignees.map((assignee) => (
              <SelectItem key={assignee.id} value={assignee.id.toString()}>
                {assignee.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="nothing" disabled>
              担当者を追加してください。
            </SelectItem>
          )
        ) : (
          <SelectItem value="loading" disabled>
            読み込み中...
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export function SelectStatus({ field }: SelectAssigneeProp) {
  return (
    <Select onValueChange={field.onChange} defaultValue={field.value}>
      <SelectTrigger className="col-span-3">
        <SelectValue placeholder="ステータスを選択" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem key="NOT_STARTED" value="NOT_STARTED">
          {getTaskStatusName("NOT_STARTED")}
        </SelectItem>
        <SelectItem key="IN_PROGRESS" value="IN_PROGRESS">
          {getTaskStatusName("IN_PROGRESS")}
        </SelectItem>
        <SelectItem key="COMPLETED" value="COMPLETED">
          {getTaskStatusName("COMPLETED")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
