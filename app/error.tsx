"use client";

import Link from "next/link";
import { useEffect } from "react";

import { AuthCard, authButtonClass, authLinkClass } from "@/features/auth/components/AuthCard";

// Last resort for an error thrown while rendering a screen: the screens handle
// their request errors themselves.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AuthCard eyebrow="WORKSPACE / ERROR" title="Something went wrong">
      <p className="mt-3 text-[11px] leading-relaxed text-[#85867c]">This screen could not be shown. Try again; if it keeps failing, go back to the dashboard.</p>
      <button type="button" onClick={() => retry()} className={authButtonClass}>Try again</button>
      <Link href="/dashboard" className={`mt-4 inline-block ${authLinkClass}`}>Back to dashboard</Link>
    </AuthCard>
  );
}
