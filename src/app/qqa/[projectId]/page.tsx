import { notFound } from "next/navigation";
import { getProjectById } from "@/app/projects/project-actions";
import { QuantitativeQualityAssessmentForm } from "@/components/quantitative-quality-assessment-form";

export default async function QuantitativeQualityAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">定量品質評価: {project.name}</h1>
      <QuantitativeQualityAssessmentForm projectId={project.id} />
    </div>
  );
}
