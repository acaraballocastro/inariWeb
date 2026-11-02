import { IncidentDetailScreen } from "@/features/incidents/components/IncidentDetailScreen";

export const instant = false;

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IncidentDetailScreen incidentId={id} />;
}
