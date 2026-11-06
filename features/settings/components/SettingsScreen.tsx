"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { forgetPreassignmentHours, getSettings, updateSettings, type Settings } from "@/features/settings/api";
import { formatJst } from "@/lib/datetime";

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";

type Draft = { push_enabled: boolean; email_enabled: boolean; preassignment_window_hours: string; unzoned_grace_minutes: string; day_before_reminder_hour: string };

function toDraft(settings: Settings): Draft {
  return { push_enabled: settings.push_enabled, email_enabled: settings.email_enabled, preassignment_window_hours: String(settings.preassignment_window_hours), unzoned_grace_minutes: String(settings.unzoned_grace_minutes), day_before_reminder_hour: String(settings.day_before_reminder_hour) };
}

/** ADMIN settings (spec 2, 3.17): notification channels in use and general operating values. */
export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getSettings()
      .then((result) => { if (active) { setSettings(result); setDraft(toDraft(result)); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the settings."); });
    return () => { active = false; };
  }, []);

  const changed = settings !== null && draft !== null && JSON.stringify(toDraft(settings)) !== JSON.stringify(draft);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const hours = Number(draft.preassignment_window_hours);
    const minutes = Number(draft.unzoned_grace_minutes);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) { setError("The time to decline must be between 1 and 168 hours."); return; }
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) { setError("The wait for days without zone must be between 0 and 1440 minutes."); return; }
    const reminderHour = Number(draft.day_before_reminder_hour);
    if (!Number.isInteger(reminderHour) || reminderHour < 0 || reminderHour > 23) { setError("The reminder hour must be between 0 and 23."); return; }
    setIsSaving(true); setError(""); setNotice("");
    try {
      const saved = await updateSettings({ push_enabled: draft.push_enabled, email_enabled: draft.email_enabled, preassignment_window_hours: hours, unzoned_grace_minutes: minutes, day_before_reminder_hour: reminderHour });
      forgetPreassignmentHours();
      setSettings(saved); setDraft(toDraft(saved));
      setNotice("Settings saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save the settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Settings" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Settings" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[860px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
              <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">MANAGEMENT / SETTINGS</p>
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Settings</h1>
              <p className="mt-2 text-lead text-[#85867c]">Notification channels and how assignments are run.{settings && ` Last changed ${formatJst(settings.updated_at, { day: "numeric", month: "short", year: "numeric" })}.`}</p>
            </header>

            {error && <p role="alert" className="mt-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
            {notice && <p role="status" className="mt-5 bg-[#eef0e9] p-3 text-body text-[#68705d]">{notice}</p>}
            {!draft && !error && <p className="mt-5 text-body text-[#85867c]">Loading settings…</p>}

            {draft && (
              <form onSubmit={handleSubmit}>
                <section className="mt-5 bg-white p-5 sm:p-6">
                  <h2 className="font-serif text-xl">Notification channels</h2>
                  <p className="mt-2 text-body text-[#85867c]">The channels in use. Each user then chooses theirs in their profile; the in-app inbox always keeps every notification.</p>
                  <div className="mt-5 space-y-4">
                    <Toggle checked={draft.push_enabled} disabled={isSaving} onChange={(push_enabled) => setDraft({ ...draft, push_enabled })} label="Push notifications" hint="To the phones and browsers where users enabled them." />
                    <Toggle checked={draft.email_enabled} disabled={isSaving} onChange={(email_enabled) => setDraft({ ...draft, email_enabled })} label="Email" hint="To the users who choose email, through the configured mail server." />
                  </div>
                </section>

                <section className="mt-5 bg-white p-5 sm:p-6">
                  <h2 className="font-serif text-xl">Assignments</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-meta">Time to decline (hours)<input type="number" min="1" max="168" step="1" value={draft.preassignment_window_hours} onChange={(event) => setDraft({ ...draft, preassignment_window_hours: event.target.value })} disabled={isSaving} className={inputClass} /><Hint>Time a guide has to decline a preassigned tour; after that it goes ahead to payment.</Hint></label>
                    <label className="text-meta">Wait for days without zone (minutes)<input type="number" min="0" max="1440" step="1" value={draft.unzoned_grace_minutes} onChange={(event) => setDraft({ ...draft, unzoned_grace_minutes: event.target.value })} disabled={isSaving} className={inputClass} /><Hint>A new day without zone is offered to every guide after this wait, giving you time to set its zone.</Hint></label>
                    <label className="text-meta">Day-before reminder (hour, JST)<input type="number" min="0" max="23" step="1" value={draft.day_before_reminder_hour} onChange={(event) => setDraft({ ...draft, day_before_reminder_hour: event.target.value })} disabled={isSaving} className={inputClass} /><Hint>From this hour, guides get a reminder of their tours of the next day, with the start time and meeting point.</Hint></label>
                  </div>
                </section>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={isSaving || !changed} className="h-9 bg-[#292b26] px-5 text-meta text-white hover:bg-[#41443b] disabled:opacity-50">{isSaving ? "Saving..." : "Save settings"}</button>
                  {changed && !isSaving && settings && <button type="button" onClick={() => setDraft(toDraft(settings))} className="text-meta underline underline-offset-2">Discard</button>}
                </div>
              </form>
            )}
          </div></div>
        </div>
      </div>
    </main>
  );
}

export function Toggle({ checked, disabled, onChange, label, hint }: { checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-[#292b26] sm:h-4 sm:w-4" />
      <span><span className="block text-body text-[#292b26]">{label}</span>{hint && <span className="mt-1 block text-label text-[#85867c]">{hint}</span>}</span>
    </label>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="mt-2 block text-label leading-relaxed text-[#96968b]">{children}</span>;
}
