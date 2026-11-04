"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/features/auth/api";
import { AuthCard, authButtonClass, authInputClass, authLinkClass } from "./AuthCard";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setIsSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send the email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <AuthCard eyebrow="SECURITY / RESET" title="Check your email">
        <p className="mt-3 text-lead leading-relaxed text-[#85867c]">If <span className="text-[#292b26]">{email.trim()}</span> belongs to an active account, we have sent it a link to choose a new password. The link works once and expires in 1 hour.</p>
        <p className="mt-3 text-lead leading-relaxed text-[#85867c]">Nothing arrived? Check your spam folder or ask your workspace administrator.</p>
        <Link href="/" className={`mt-6 inline-block ${authLinkClass}`}>Back to sign in</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="SECURITY / RESET" title="Forgot your password?">
      <p className="mt-3 text-lead leading-relaxed text-[#85867c]">Enter the email of your account and we will send you a link to choose a new one.</p>
      <form onSubmit={handleSubmit} className="mt-6">
        <label className="block text-body text-[#77796f]">Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={authInputClass} /></label>
        {error && <p role="alert" className="mt-4 text-body leading-relaxed text-[#9b6f37]">{error}</p>}
        <button type="submit" disabled={isSubmitting} className={authButtonClass}>{isSubmitting ? "Sending..." : "Send reset link"}</button>
      </form>
      <Link href="/" className={`mt-4 inline-block ${authLinkClass}`}>Back to sign in</Link>
    </AuthCard>
  );
}
