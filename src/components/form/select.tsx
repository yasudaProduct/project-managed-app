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

type SelectPhasesProp = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any, string>;
  wbsId?: number;
};

type SelectAssigneeProp = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any, string>;
  wbsId?: number;
};

export default function SelectPhases({ field, wbsId }: SelectPhasesProp) {
  const [phases, setPhases] =
    useState<{ id: number; name: string; seq: number }[]>();

  useEffect(() => {
    console.log("wbsId", wbsId);
    const fetchPhases = async () => {
      if (wbsId) {
        const phases = await getWbsPhases(wbsId);
        setPhases(phases);
      } else {
        // TODO wbsIdがない場合は、全てのフェーズを取得する
        // const phases = await getPhases();
        // setPhases(phases);
      }
    };
    fetchPhases();
  }, []);

  return (
    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

export function SelectAssignee({ field, wbsId }: SelectAssigneeProp) {
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>();

  useEffect(() => {
    const fetchAssignees = async () => {
      if (wbsId) {
        const assignees = (await getWbsAssignees(wbsId)).map((a) => {
          return {
            id: a.assignee.id,
            name: a.assignee.displayName,
          };
        });
        setAssignees(assignees);
      } else {
        // TODO wbsIdがない場合は、全ての担当者を取得する
        // const assignees = await getAssignees();
        // setAssignees(assignees);
      }
    };
    fetchAssignees();
  }, []);

  return (
    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
