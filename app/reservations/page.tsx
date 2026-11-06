import { ReservationsScreen } from "@/features/reservations/components/ReservationsScreen";

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { customer_id: customerId, customer } = await searchParams;
  return <ReservationsScreen customerId={typeof customerId === "string" ? customerId : undefined} customerName={typeof customer === "string" ? customer : undefined} />;
}
