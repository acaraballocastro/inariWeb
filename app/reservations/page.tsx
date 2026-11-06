import { Suspense } from "react";
import { ReservationsFromQuery, ReservationsScreen } from "@/features/reservations/components/ReservationsScreen";

// The query (?customer_id=) is read in the browser, inside Suspense, so the
// page still prerenders; the fallback is the unfiltered list.
export default function ReservationsPage() {
  return (
    <Suspense fallback={<ReservationsScreen />}>
      <ReservationsFromQuery />
    </Suspense>
  );
}
