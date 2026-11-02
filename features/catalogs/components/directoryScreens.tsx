"use client";

import { createActivity, deleteActivity, listAllActivities, updateActivity, type Activity } from "@/features/catalogs/api";
import { createAgency, createCustomer, deleteAgency, deleteCustomer, listAgencies, listCustomers, updateAgency, updateCustomer, type Agency, type CustomerInput, type ReservationCustomer } from "@/features/reservations/api";
import { ActiveBadge, RecordsScreen, type RecordDraft, type RecordsConfig } from "./RecordsScreen";

const text = (draft: RecordDraft, key: string) => String(draft[key] ?? "").trim();

const byName = <T,>(name: (item: T) => string) => (items: T[] | null) => [...(items ?? [])].sort((a, b) => name(a).localeCompare(name(b)));

// Module-level so the list functions keep their identity across renders.
const agencyConfig: RecordsConfig<Agency> = {
  title: "Agencies",
  eyebrow: "MANAGEMENT / PARTNERS",
  description: "Travel agencies that send reservations. Inactive agencies are hidden when creating a reservation.",
  activeItem: "Agencies",
  noun: "agency",
  columns: [
    { label: "Name", width: "minmax(180px,1.2fr)", render: (item) => <span className="text-[10px]">{item.name}</span> },
    { label: "Representative", width: "minmax(140px,1fr)", render: (item) => item.representative || "—" },
    { label: "Email", width: "minmax(180px,1.2fr)", render: (item) => <span className="text-[#85867c]">{item.email || "—"}</span> },
    { label: "Status", width: "90px", render: (item) => <ActiveBadge active={item.is_active} /> },
  ],
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "representative", label: "Representative" },
    { key: "email", label: "Email", type: "email" },
  ],
  isActive: (item) => item.is_active,
  searchText: (item) => `${item.name} ${item.representative} ${item.email}`,
  toDraft: (item) => ({ name: item?.name ?? "", representative: item?.representative ?? "", email: item?.email ?? "", is_active: item?.is_active ?? true }),
  list: () => listAgencies().then(byName<Agency>((item) => item.name)),
  create: (draft) => createAgency({ name: text(draft, "name"), representative: text(draft, "representative"), email: text(draft, "email") }),
  update: (item, draft) => updateAgency(item.id, { name: text(draft, "name"), representative: text(draft, "representative"), email: text(draft, "email"), is_active: draft.is_active === true }),
  remove: (item) => deleteAgency(item.id),
  label: (item) => item.name,
};

function toCustomerInput(draft: RecordDraft): CustomerInput {
  return { full_name: text(draft, "full_name"), document_number: text(draft, "document_number"), phone: text(draft, "phone"), email: text(draft, "email"), age: Number(text(draft, "age")) };
}

const customerConfig: RecordsConfig<ReservationCustomer> = {
  title: "Customers",
  eyebrow: "MANAGEMENT / TRAVELLERS",
  description: "Travellers linked to reservations. They are also created when a reservation adds a new customer.",
  activeItem: "Customers",
  noun: "customer",
  columns: [
    { label: "Name", width: "minmax(170px,1.2fr)", render: (item) => <span className="text-[10px]">{item.full_name}</span> },
    { label: "Email", width: "minmax(170px,1.2fr)", render: (item) => <span className="text-[#85867c]">{item.email || "—"}</span> },
    { label: "Phone", width: "minmax(110px,0.8fr)", render: (item) => item.phone || "—" },
    { label: "Document", width: "minmax(110px,0.8fr)", render: (item) => item.document_number || "—" },
    { label: "Age", width: "50px", render: (item) => item.age ?? "—" },
  ],
  fields: [
    { key: "full_name", label: "Full name", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "document_number", label: "Document number" },
    { key: "age", label: "Age", type: "number", required: true },
  ],
  searchText: (item) => `${item.full_name} ${item.email} ${item.phone} ${item.document_number}`,
  toDraft: (item) => ({ full_name: item?.full_name ?? "", email: item?.email ?? "", phone: item?.phone ?? "", document_number: item?.document_number ?? "", age: item?.age == null ? "" : String(item.age) }),
  list: () => listCustomers().then(byName<ReservationCustomer>((item) => item.full_name)),
  create: (draft) => createCustomer(toCustomerInput(draft)),
  update: (item, draft) => updateCustomer(item.id, toCustomerInput(draft)),
  remove: (item) => deleteCustomer(item.id),
  label: (item) => item.full_name,
};

const activityConfig: RecordsConfig<Activity> = {
  title: "Activities",
  eyebrow: "CONTENT / CATALOG",
  description: "Experiences that can be added as stops to a tour day itinerary. Inactive ones are hidden from the itinerary editor.",
  activeItem: "Activities",
  noun: "activity",
  columns: [
    { label: "Name", width: "minmax(180px,1fr)", render: (item) => <span className="text-[10px]">{item.name}</span> },
    { label: "Description", width: "minmax(240px,2fr)", render: (item) => <span className="text-[#85867c]">{item.description || "—"}</span> },
    { label: "Status", width: "90px", render: (item) => <ActiveBadge active={item.is_active} /> },
  ],
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "description", label: "Description", type: "textarea" },
  ],
  isActive: (item) => item.is_active,
  searchText: (item) => `${item.name} ${item.description ?? ""}`,
  toDraft: (item) => ({ name: item?.name ?? "", description: item?.description ?? "", is_active: item?.is_active ?? true }),
  list: () => listAllActivities().then(byName<Activity>((item) => item.name)),
  create: (draft) => createActivity({ name: text(draft, "name"), description: text(draft, "description") || null }),
  update: (item, draft) => updateActivity(item.id, { name: text(draft, "name"), description: text(draft, "description") || null, is_active: draft.is_active === true }),
  remove: (item) => deleteActivity(item.id),
  label: (item) => item.name,
};

export function AgenciesScreen() {
  return <RecordsScreen config={agencyConfig} />;
}

export function CustomersScreen() {
  return <RecordsScreen config={customerConfig} />;
}

export function ActivitiesScreen() {
  return <RecordsScreen config={activityConfig} />;
}
