"use client";

import { ChangeEvent, useState } from "react";
import { Button } from "../ui/button";
import { parse } from "csv-parse/sync";
import { generateSchedule } from "@/app/schedule-generator/action";

export function ScheduleGenerator({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const handleCsvUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      const csv = parse(text as string, {
        columns: true,
        skip_empty_lines: true,
      });
      await generateSchedule(csv, selectedProjectId); // projectIdを渡す
    };
    reader.readAsText(file);
  };

  return (
    <div className="">
      <select
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="">プロジェクトを選択</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex flex-row items-center gap-4 mt-10">
        <label>
          <input
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleCsvUpload}
            disabled={!selectedProjectId}
          />
          <Button asChild disabled={!selectedProjectId}>
            <span>CSVアップロード</span>
          </Button>
        </label>
        <Button
          onClick={() => {
            console.log("CSVダウンロード");
          }}
        >
          CSVダウンロード
        </Button>
      </div>
    </div>
  );
}
