import { redirect } from "next/navigation";

export default async function QualityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/wbs/${id}?tab=quality`);
}
