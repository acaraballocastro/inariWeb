"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { resetPassword } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { AuthCard, authButtonClass, authInputClass, authLinkClass } from "./AuthCard";

export function ResetPasswordScreen({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isLinkInvalid, setIsLinkInvalid] = useState(!token);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[\p{P}\p{S}]/u.test(newPassword)) {
      setError("The password needs at least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setIsDone(true);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === "INVALID_RESET_TOKEN") {
        setIsLinkInvalid(true);
      } else {
        setError(requestError instanceof Error ? requestError.message : "Could not change the password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <AuthCard eyebrow="SECURITY / RESET" title="Password updated">
        <p className="mt-3 text-[11px] leading-relaxed text-[#85867c]">You can now sign in with your new password.</p>
        <Link href="/" className={authButtonClass}>Sign in</Link>
      </AuthCard>
    );
  }

  if (isLinkInvalid) {
    return (
      <AuthCard eyebrow="SECURITY / RESET" title="This link no longer works">
        <p className="mt-3 text-[11px] leading-relaxed text-[#85867c]">Reset links work once and expire after 1 hour. Ask for a new one.</p>
        <Link href="/forgot-password" className={authButtonClass}>Send a new link</Link>
        <Link href="/" className={`mt-4 inline-block ${authLinkClass}`}>Back to sign in</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="SECURITY / RESET" title="Choose a new password">
      <p className="mt-3 text-[11px] leading-relaxed text-[#85867c]">At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.</p>
      <form onSubmit={handleSubmit} className="mt-6">
        <label className="block text-[10px] text-[#77796f]">New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={authInputClass} /></label>
        <label className="mt-4 block text-[10px] text-[#77796f]">Confirm new password<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={authInputClass} /></label>
        {error && <p role="alert" className="mt-4 text-[10px] leading-relaxed text-[#9b6f37]">{error}</p>}
        <button type="submit" disabled={isSubmitting} className={authButtonClass}>{isSubmitting ? "Updating..." : "Update password"}</button>
      </form>
    </AuthCard>
  );
}
