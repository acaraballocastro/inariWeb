"use client";

import { useState } from "react";
import type { ReservationCustomer, ReservationCustomerInput } from "@/features/reservations/api";

const emptyNewCustomer = { full_name: "", email: "", phone: "", document_number: "", age: "" };

export function toCustomerInputs(customers: ReservationCustomer[]): ReservationCustomerInput[] {
  return customers.map((customer) => ({ id: customer.id, full_name: customer.full_name, document_number: customer.document_number, phone: customer.phone, email: customer.email, age: customer.age ?? 0 }));
}

export function CustomerPicker({ customers, value, onChange, disabled = false, inputClass, labelClass }: { customers: ReservationCustomer[]; value: ReservationCustomerInput[]; onChange: (value: ReservationCustomerInput[]) => void; disabled?: boolean; inputClass: string; labelClass: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer);
  const [error, setError] = useState("");

  const selectedIds = new Set(value.map((customer) => customer.id).filter(Boolean));
  const available = customers.filter((customer) => !selectedIds.has(customer.id));

  function addExisting(id: string) {
    const customer = customers.find((item) => item.id === id);
    if (customer) onChange([...value, ...toCustomerInputs([customer])]);
  }

  function addNew() {
    const email = newCustomer.email.trim().toLowerCase();
    const age = newCustomer.age ? Number(newCustomer.age) : 0;
    if (!newCustomer.full_name.trim()) { setError("Enter the customer's full name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email."); return; }
    if (!Number.isInteger(age) || age < 0) { setError("The age must be a positive number."); return; }
    if (value.some((customer) => customer.email.toLowerCase() === email)) { setError("This customer is already added."); return; }
    onChange([...value, { full_name: newCustomer.full_name.trim(), email, phone: newCustomer.phone.trim(), document_number: newCustomer.document_number.trim(), age }]);
    setNewCustomer(emptyNewCustomer); setIsCreating(false); setError("");
  }

  return (
    <div className={labelClass}>
      <span>Customers</span>
      {value.length === 0 ? <p className="mt-2 text-[9px] text-[#96968b]">No customer assigned.</p> : (
        <ul className="mt-2 divide-y divide-[#ecebe5] border border-[#e3e1da]">
          {value.map((customer) => (
            <li key={customer.id ?? customer.email} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0"><p className="truncate text-[10px] text-[#292b26]">{customer.full_name}{!customer.id && <span className="ml-2 bg-[#e9e5d7] px-1.5 py-0.5 text-[8px] text-[#77786f]">New</span>}</p><p className="mt-0.5 truncate text-[8px] text-[#85867c]">{customer.email || "No email"}{customer.phone ? ` · ${customer.phone}` : ""}</p></div>
              <button type="button" disabled={disabled} onClick={() => onChange(value.filter((item) => item !== customer))} aria-label={`Remove ${customer.full_name}`} className="text-[9px] text-[#9b6f37] underline underline-offset-2 disabled:opacity-50">Remove</button>
            </li>
          ))}
        </ul>
      )}

      {!isCreating && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <select value="" disabled={disabled || available.length === 0} onChange={(event) => addExisting(event.target.value)} className={`${inputClass} mt-0! sm:flex-1`}>
            <option value="">{available.length ? "Add an existing customer" : "No more customers available"}</option>
            {available.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}{customer.email ? ` · ${customer.email}` : ""}</option>)}
          </select>
          <button type="button" disabled={disabled} onClick={() => setIsCreating(true)} className="min-h-9 shrink-0 self-stretch border border-[#deddd6] px-4 text-[10px] text-[#292b26] hover:bg-[#f8f7f3] disabled:opacity-50">+ New customer</button>
        </div>
      )}

      {isCreating && (
        <div className="mt-2 grid gap-3 border border-[#e3e1da] bg-[#fbfaf7] p-3 sm:grid-cols-2">
          <label className={labelClass}>Full name *<input value={newCustomer.full_name} onChange={(event) => setNewCustomer({ ...newCustomer, full_name: event.target.value })} className={inputClass} /></label>
          <label className={labelClass}>Email *<input type="email" value={newCustomer.email} onChange={(event) => setNewCustomer({ ...newCustomer, email: event.target.value })} className={inputClass} /></label>
          <label className={labelClass}>Phone<input value={newCustomer.phone} onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })} className={inputClass} /></label>
          <label className={labelClass}>Document number<input value={newCustomer.document_number} onChange={(event) => setNewCustomer({ ...newCustomer, document_number: event.target.value })} className={inputClass} /></label>
          <label className={labelClass}>Age<input type="number" min={0} step={1} value={newCustomer.age} onChange={(event) => setNewCustomer({ ...newCustomer, age: event.target.value })} className={inputClass} /></label>
          {error && <p role="alert" className="text-[9px] text-[#9b6f37] sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2"><button type="button" onClick={addNew} className="h-9 bg-[#292b26] px-4 text-[9px] text-white hover:bg-[#41443b]">Add customer</button><button type="button" onClick={() => { setIsCreating(false); setNewCustomer(emptyNewCustomer); setError(""); }} className="h-9 border border-[#deddd6] px-4 text-[9px] hover:bg-[#f8f7f3]">Cancel</button></div>
        </div>
      )}
    </div>
  );
}
