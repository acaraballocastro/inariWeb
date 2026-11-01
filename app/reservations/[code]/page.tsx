import { ReservationDetailScreen } from "@/features/reservations/components/ReservationDetailScreen";

export const instant = false;

export default async function ReservationDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ReservationDetailScreen code={code} />;
}