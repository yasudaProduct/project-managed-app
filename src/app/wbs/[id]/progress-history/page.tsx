export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getWbsById } from '../actions/wbs-actions';
import { getEditableProgressSnapshots } from '../progress-history-actions';
import { ProgressHistoryContent } from '@/components/wbs/progress-history-content';

export default async function ProgressHistoryPage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;
  const wbsId = Number(id);

  const wbs = await getWbsById(wbsId);
  if (!wbs) notFound();

  const result = await getEditableProgressSnapshots({ wbsId });

  return (
    <ProgressHistoryContent
      wbsId={wbsId}
      wbsName={wbs.name}
      snapshots={result.success && result.data ? result.data : []}
    />
  );
}
