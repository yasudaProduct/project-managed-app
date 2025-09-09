import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { WbsImportClient } from "./wbs-import-client";

export default async function WbsImportPage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;

  const wbs = await getWbsById(id);
  if (!wbs) {
    notFound();
  }

  const project = await prisma.projects.findUnique({
    where: {
      id: wbs.projectId,
    },
  });
  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/wbs/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            WBSに戻る
          </Button>
        </Link>
      </div>

      <WbsImportClient 
        wbsId={wbs.id} 
        projectId={project.id.toString()}
        projectName={project.name} 
      />
    </div>
  );
}