"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { Logo } from "@/features/brand/Logo";

function loginErrorMessage(requestError: unknown) {
  if (requestError instanceof ApiError) {
    if (requestError.code === "TOO_MANY_REQUESTS") return "Too many failed attempts. Wait a few minutes or use \"Forgot your password?\".";
    if (requestError.code === "TEMPORARY_PASSWORD_EXPIRED") return "Your temporary password has expired. Ask your administrator for a new invitation or use \"Forgot your password?\".";
  }
  return requestError instanceof Error ? requestError.message : "Could not sign in.";
}

export function LoginPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await login(email.trim(), password);
      router.replace(session.mustChangePassword ? "/change-password" : "/dashboard");
    } catch (requestError) {
      setError(loginErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-col px-8 py-10 sm:px-12 sm:py-12 lg:px-[clamp(48px,6vw,96px)]">
      <header>
        <Link href="/" aria-label="INARI Tours, home" className="inline-block">
          <Logo width={210} />
        </Link>
      </header>

      <div className="my-auto w-full max-w-[430px] py-12">
        <p className="text-body font-semibold tracking-[0.16em] text-[#9b8353]">
          YOUR OPERATIONS WORKSPACE
        </p>

        <h1 className="mt-5 font-serif text-3xl font-medium tracking-tight text-[#282a25] sm:text-[32px]">
          Welcome back.
        </h1>

        <p className="mt-4 text-sm text-[#77796f]">
          Exceptional journeys begin with you.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 max-w-[380px] rounded-md border border-[#e8e6df] bg-white p-4">
          <h2 className="text-xs font-medium text-[#282a25]">Sign in to your workspace</h2>

          <label className="mt-4 block text-body text-[#77796f]">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-10 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-xs text-[#282a25] outline-none focus:border-[#b5a786]" />
          </label>

          <label className="mt-3 block text-body text-[#77796f]">
            Password
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-10 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-xs text-[#282a25] outline-none focus:border-[#b5a786]" />
          </label>

          {error && <p role="alert" className="mt-3 text-body leading-relaxed text-[#9b6f37]">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="mt-4 flex min-h-11 w-full items-center justify-center rounded-[3px] bg-[#252821] px-4 text-xs font-medium text-white transition-colors hover:bg-[#3a3d34] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252821]">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <Link href="/forgot-password" className="mt-3 inline-block text-body text-[#77796f] underline underline-offset-4 hover:text-[#282a25]">
            Forgot your password?
          </Link>
        </form>

        <p className="mt-4 max-w-[380px] text-lead leading-relaxed text-[#77796f]">
          Access is managed by your InariOps workspace administrator.
        </p>
      </div>

      <footer className="text-body text-[#77796f]">
        © 2026 INARI TOURS · Crafted journeys, considered details.
      </footer>
    </section>
  );
}