import Link from "next/link";

import { AuthCard, authLinkClass } from "@/features/auth/components/AuthCard";

export default function NotFound() {
  return (
    <AuthCard eyebrow="WORKSPACE / NOT FOUND" title="Page not found">
      <p className="mt-3 text-[11px] leading-relaxed text-[#85867c]">The address does not match any screen of the workspace.</p>
      <Link href="/dashboard" className={`mt-6 inline-block ${authLinkClass}`}>Back to dashboard</Link>
    </AuthCard>
  );
}
