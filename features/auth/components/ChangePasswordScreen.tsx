"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, logout } from "@/features/auth/api";
import { getSession, saveSession } from "@/lib/api/client";

export function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/");
      return;
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[\p{P}\p{S}]/u.test(newPassword)) {
      setError("La contraseña debe tener 8 caracteres, mayúscula, minúscula, número y símbolo.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      await changePassword(session.userId, oldPassword, newPassword);
      saveSession({ ...session, mustChangePassword: false });
      router.replace("/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cambiar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.replace("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f1f0ec] px-5 text-[#292b26]">
      <section className="w-full max-w-[430px] bg-[#f8f7f3] p-7 sm:p-10">
        <p className="font-serif text-[25px] tracking-[0.16em]">INARI</p>
        <p className="mt-2 text-[8px] tracking-[0.5em] text-[#9b8353]">TOURS</p>
        <p className="mt-12 text-[9px] font-semibold tracking-[0.18em] text-[#9b8353]">SECURITY / REQUIRED</p>
        <h1 className="mt-4 font-serif text-3xl tracking-[-0.04em]">Choose a new password</h1>
        <p className="mt-3 text-[11px] leading-relaxed text-[#85867c]">Your workspace administrator created your account with a temporary password.</p>
        <form onSubmit={handleSubmit} className="mt-6">
          <label className="block text-[10px] text-[#77796f]">Current password<input type="password" autoComplete="current-password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} className="mt-2 h-10 w-full border border-[#e3e1da] bg-white px-3 text-xs outline-none focus:border-[#b5a786]" /></label>
          <label className="mt-4 block text-[10px] text-[#77796f]">New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 h-10 w-full border border-[#e3e1da] bg-white px-3 text-xs outline-none focus:border-[#b5a786]" /></label>
          <label className="mt-4 block text-[10px] text-[#77796f]">Confirm new password<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-10 w-full border border-[#e3e1da] bg-white px-3 text-xs outline-none focus:border-[#b5a786]" /></label>
          {error && <p role="alert" className="mt-4 text-[10px] leading-relaxed text-[#9b6f37]">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="mt-5 flex h-11 w-full items-center justify-center bg-[#292b26] text-xs font-medium text-white hover:bg-[#3a3d34] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Updating..." : "Update password"}</button>
        </form>
        <button type="button" onClick={handleSignOut} className="mt-4 text-[10px] text-[#77796f] underline underline-offset-4 hover:text-[#292b26]">Sign out</button>
      </section>
    </main>
  );
}
