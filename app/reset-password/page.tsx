import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordScreen } from "@/features/auth/components/ResetPasswordScreen";

// The URL carries the reset token: never send it to other sites as a referrer.
export const metadata: Metadata = { referrer: "no-referrer" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  // The token is request-time data: it is read behind Suspense so the rest of
  // the page can still be prerendered (cacheComponents).
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#f1f0ec]" />}>
      <ResetPasswordWithToken searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordWithToken({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  return <ResetPasswordScreen token={typeof token === "string" ? token : ""} />;
}
