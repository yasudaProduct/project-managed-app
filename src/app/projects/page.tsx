export const dynamic = 'force-dynamic';

import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { getProjectAll } from "./actions";
import { columns } from "./columns";
import { getProjectStatusName } from "@/utils/utils";
import { formatDate } from "@/utils/date-util";
import {
  PROJECT_KINDS,
  PROJECT_KIND_LABELS,
  STANDING_CATEGORY_LABELS,
  type ProjectKind,
} from "@/types/project";

const searchParamsSchema = z.object({
  kind: z.enum(PROJECT_KINDS).optional(),
});

const KIND_FILTERS: Array<{ value: ProjectKind | undefined; label: string }> = [
  { value: undefined, label: "すべて" },
  { value: "PROJECT", label: PROJECT_KIND_LABELS.PROJECT },
  { value: "STANDING", label: PROJECT_KIND_LABELS.STANDING },
];

function kindLabel(project: { kind: ProjectKind; category?: string }): string {
  if (project.kind !== "STANDING") return PROJECT_KIND_LABELS.PROJECT;
  const category = project.category
    ? STANDING_CATEGORY_LABELS[project.category as keyof typeof STANDING_CATEGORY_LABELS]
    : undefined;
  return category ? `${PROJECT_KIND_LABELS.STANDING}（${category}）` : PROJECT_KIND_LABELS.STANDING;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const raw = await searchParams;
  const parsed = searchParamsSchema.safeParse({
    kind: Array.isArray(raw.kind) ? raw.kind[0] : raw.kind,
  });
  const kindFilter = parsed.success ? parsed.data.kind : undefined;

  const projects = await getProjectAll();

  if (!projects) {
    return <div>プロジェクトが見つかりませんでした。</div>;
  }

  const visibleProjects = kindFilter
    ? projects.filter((project) => project.kind === kindFilter)
    : projects;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">プロジェクト一覧</h1>
        <Link href="/projects/new">
          <Button>新規プロジェクト作成</Button>
        </Link>
      </div>
      <div className="flex items-center gap-2 mb-4" aria-label="種別で絞り込み">
        {KIND_FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `/projects?kind=${filter.value}` : "/projects"}
          >
            <Button variant={kindFilter === filter.value ? "default" : "outline"} size="sm">
              {filter.label}
            </Button>
          </Link>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={visibleProjects.map((project) => {
          return {
            id: project.id,
            name: project.name,
            kind: kindLabel(project),
            description: project.description,
            startDate: formatDate(project.startDate, "YYYY/MM/DD"),
            endDate: formatDate(project.endDate, "YYYY/MM/DD"),
            status: getProjectStatusName(project.status),
            link: `/projects/${project.id}`,
          };
        })}
      />
    </div>
  );
}
