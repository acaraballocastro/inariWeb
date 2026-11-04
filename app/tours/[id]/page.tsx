import { TourDetailScreen } from "@/features/tours/components/TourDetailScreen";

export const instant = false;

export default async function TourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TourDetailScreen tourDayId={id} />;
}
