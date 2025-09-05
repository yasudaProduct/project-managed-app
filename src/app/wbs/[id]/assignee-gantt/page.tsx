import { notFound } from 'next/navigation';
import { AssigneeGanttChart } from './assignee-gantt-chart';

interface AssigneeGanttPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssigneeGanttPage({ params }: AssigneeGanttPageProps) {
  const { id } = await params;
  const wbsId = parseInt(id);
  
  if (isNaN(wbsId)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          担当者別ガントチャート
        </h1>
        <p className="text-gray-600 mt-1">
          担当者の日別作業負荷を確認し、過負荷状態を未然に防ぎます
        </p>
      </div>
      
      <AssigneeGanttChart wbsId={wbsId} />
    </div>
  );
}