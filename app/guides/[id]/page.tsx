import { GuideDetailScreen } from "@/features/guides/components/GuideDetailScreen";

export const instant = false;

export default async function GuideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GuideDetailScreen guideId={id} />;
}
