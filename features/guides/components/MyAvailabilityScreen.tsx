"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { getGuideByUser } from "@/features/guides/api";
import { GuideDetailScreen } from "@/features/guides/components/GuideDetailScreen";
import { getSession } from "@/lib/api/client";

/** The signed-in guide's profile and blocked dates. */
export function MyAvailabilityScreen() {
  const [guideId, setGuideId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    getGuideByUser(session.userId)
      .then((guide) => setGuideId(guide.id))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load your guide profile."));
  }, []);

  if (guideId) return <GuideDetailScreen guideId={guideId} self />;

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Availability" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Availability" />
          <p role={error ? "alert" : undefined} className={`px-5 pt-8 text-[10px] sm:px-8 lg:px-10 ${error ? "text-[#9b6f37]" : "text-[#85867c]"}`}>{error || "Loading..."}</p>
        </div>
      </div>
    </main>
  );
}
