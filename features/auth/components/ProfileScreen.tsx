"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { getMe, updateMe } from "@/features/auth/api";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { listLanguages, listZones, type Language, type Zone } from "@/features/catalogs/api";
import { getNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from "@/features/settings/api";
import { Toggle } from "@/features/settings/components/SettingsScreen";
import { getGuideByUser, getGuideDetail, updateGuideSkills, type GuideDetail } from "@/features/guides/api";
import type { User } from "@/features/users/api";
import { formatStatus } from "@/lib/status";

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";

/**
 * The signed-in user's own profile (spec 4.9): name and phone are theirs to
 * change, and guides also choose their zones and languages; email, role and
 * the daily limit are administrative and only shown.
 */
export function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getMe()
      .then(async (me) => {
        if (!active) return;
        setUser(me); setName(me.name); setPhone(me.phone ?? "");
        if (me.role !== "GUIDE") return;
        const record = await getGuideByUser(me.id);
        const detail = await getGuideDetail(record.id);
        if (active) setGuide(detail);
      })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load your profile."); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!name.trim()) { setError("Your name cannot be empty."); return; }
    setIsSaving(true); setError(""); setNotice("");
    try {
      const saved = await updateMe({ name, phone });
      setUser(saved); setName(saved.name); setPhone(saved.phone ?? "");
      setNotice("Profile saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  const changed = user !== null && (name.trim() !== user.name || phone.trim() !== (user.phone ?? ""));

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Profile" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Profile" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[860px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
              <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">ACCOUNT / PROFILE</p>
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">{user?.name || "My profile"}</h1>
              <p className="mt-2 text-lead text-[#85867c]">Your contact details. Operations manages the rest of your account.</p>
            </header>

            {error && <p role="alert" className="mt-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
            {notice && <p role="status" className="mt-5 bg-[#eef0e9] p-3 text-body text-[#68705d]">{notice}</p>}
            {!user && !error && <p className="mt-5 text-body text-[#85867c]">Loading profile…</p>}

            {user && (
              <form onSubmit={handleSubmit} className="mt-5 bg-white p-5 sm:p-6">
                <h2 className="font-serif text-xl">Contact details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-meta">Name *<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" disabled={isSaving} className={inputClass} /></label>
                  <label className="text-meta">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" placeholder="+81 90-1234-5678" disabled={isSaving} className={inputClass} /></label>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={isSaving || !changed} className="h-9 bg-[#292b26] px-5 text-meta text-white hover:bg-[#41443b] disabled:opacity-50">{isSaving ? "Saving..." : "Save changes"}</button>
                  {changed && !isSaving && <button type="button" onClick={() => { setName(user.name); setPhone(user.phone ?? ""); }} className="text-meta underline underline-offset-2">Discard</button>}
                </div>
              </form>
            )}

            {guide && <GuideSkills guide={guide} onSaved={setGuide} />}

            {user && <NotificationChannels />}

            {user && (
              <section className="mt-5 bg-white p-5 sm:p-6">
                <h2 className="font-serif text-xl">Account</h2>
                <p className="mt-2 text-body text-[#85867c]">Ask operations to change these.</p>
                <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Info label="Email (sign-in)" value={user.email} />
                  <Info label="Role" value={formatStatus(user.role)} />
                  {guide && <Info label="Tours per day" value={`Up to ${guide.guide.max_tours_per_day}`} />}
                </div>
                <div className="mt-6 flex flex-wrap gap-4 border-t border-[#ecebe5] pt-4 text-meta">
                  {user.role === "GUIDE" && <Link href="/availability" className="underline underline-offset-2">Manage availability</Link>}
                  <Link href="/change-password" className="underline underline-offset-2">Change password</Link>
                </div>
              </section>
            )}
          </div></div>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div><p className="text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{label}</p><p className="mt-2 break-words text-body text-[#55574f]">{value}</p></div>;
}

/** The guide picks the zones they work in and the languages they speak. */
function GuideSkills({ guide, onSaved }: { guide: GuideDetail; onSaved: (guide: GuideDetail) => void }) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [languageIds, setLanguageIds] = useState<string[]>(() => guide.languages.map((language) => language.id));
  const [zoneIds, setZoneIds] = useState<string[]>(() => guide.zones.map((zone) => zone.id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([listLanguages(), listZones()])
      .then(([languageItems, zoneItems]) => { if (active) { setLanguages(languageItems ?? []); setZones(zoneItems ?? []); } })
      .catch(() => { if (active) setError("Could not load the zones and languages."); });
    return () => { active = false; };
  }, []);

  const savedLanguages = guide.languages.map((language) => language.id);
  const savedZones = guide.zones.map((zone) => zone.id);
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));
  const changed = !sameSet(languageIds, savedLanguages) || !sameSet(zoneIds, savedZones);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

  async function save() {
    setIsSaving(true); setError(""); setNotice("");
    try {
      const saved = await updateGuideSkills(guide.guide.id, {
        languages: languages.filter((language) => languageIds.includes(language.id)),
        zones: zones.filter((zone) => zoneIds.includes(zone.id)),
      });
      onSaved(saved);
      setLanguageIds(saved.languages.map((language) => language.id));
      setZoneIds(saved.zones.map((zone) => zone.id));
      setNotice("Zones and languages saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save your zones and languages.");
    } finally {
      setIsSaving(false);
    }
  }

  const chips = (items: { id: string; name: string; is_active: boolean }[], selected: string[], onToggle: (id: string) => void) => (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.filter((item) => item.is_active || selected.includes(item.id)).map((item) => {
        const on = selected.includes(item.id);
        return <button key={item.id} type="button" aria-pressed={on} disabled={isSaving} onClick={() => onToggle(item.id)} className={`h-8 border px-3 text-meta disabled:opacity-50 ${on ? "border-[#292b26] bg-[#292b26] text-white" : "border-[#deddd6] hover:bg-[#f8f7f3]"}`}>{item.name}</button>;
      })}
    </div>
  );

  return (
    <section className="mt-5 bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Zones and languages</h2>
      <p className="mt-2 text-body text-[#85867c]">You are offered free tours in your zones; operations is warned when a tour needs a language you do not speak.</p>
      {error && <p role="alert" className="mt-4 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
      {notice && <p role="status" className="mt-4 bg-[#eef0e9] p-3 text-body text-[#68705d]">{notice}</p>}
      <p className="mt-5 text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">Zones</p>
      {chips(zones, zoneIds, (id) => setZoneIds((current) => toggle(current, id)))}
      <p className="mt-5 text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">Languages</p>
      {chips(languages, languageIds, (id) => setLanguageIds((current) => toggle(current, id)))}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={isSaving || !changed} className="h-9 bg-[#292b26] px-5 text-meta text-white hover:bg-[#41443b] disabled:opacity-50">{isSaving ? "Saving..." : "Save zones and languages"}</button>
        {changed && !isSaving && <button type="button" onClick={() => { setLanguageIds(savedLanguages); setZoneIds(savedZones); }} className="text-meta underline underline-offset-2">Discard</button>}
      </div>
    </section>
  );
}

/** The channels the user wants notifications through; saved on each change. */
function NotificationChannels() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getNotificationPreferences()
      .then((result) => { if (active) setPrefs(result); })
      .catch(() => { if (active) setError("Could not load your notification channels."); });
    return () => { active = false; };
  }, []);

  async function change(input: { push?: boolean; email?: boolean }) {
    if (!prefs) return;
    setIsSaving(true); setError("");
    setPrefs({ ...prefs, ...input });
    try {
      setPrefs(await updateNotificationPreferences(input));
    } catch (requestError) {
      setPrefs(prefs);
      setError(requestError instanceof Error ? requestError.message : "Could not save your notification channels.");
    } finally {
      setIsSaving(false);
    }
  }

  const off = " Turned off by operations for now.";
  return (
    <section className="mt-5 bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Notifications</h2>
      <p className="mt-2 text-body text-[#85867c]">How you want to hear about your tours and incidents. The notifications page always keeps them all.</p>
      {error && <p role="alert" className="mt-4 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
      {prefs && (
        <div className="mt-5 space-y-4">
          <Toggle checked={prefs.push} disabled={isSaving} onChange={(push) => change({ push })} label="Push notifications" hint={`On the devices where you allowed them.${prefs.available.push ? "" : off}`} />
          <Toggle checked={prefs.email} disabled={isSaving} onChange={(email) => change({ email })} label="Email" hint={`To your sign-in email.${prefs.available.email ? "" : off}`} />
        </div>
      )}
    </section>
  );
}
