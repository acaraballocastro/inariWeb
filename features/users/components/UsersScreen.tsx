"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { Select } from "@/features/dashboard/components/Select";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { closeUserSessions, createUser, deactivateUser, deleteUserPermanently, listUsers, resendInvitation, updateUser, type User, type UserRole } from "@/features/users/api";

export function UsersScreen() {
  const { confirm } = useDialogs();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", role: "GUIDE" as UserRole });

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load the users."))
      .finally(() => setIsLoading(false));
  }, []);
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => !normalizedQuery || `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(normalizedQuery));
  }, [query, users]);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.phone.trim()) {
      setFormError("Enter a name, email and phone.");
      return;
    }
    setIsCreating(true);
    try {
      const response = await createUser(newUser);
      setUsers((currentUsers) => [...currentUsers, { ...response.User, invitation_pending: true }]);
      setNotice(`Invitation sent to ${response.User.email} with a temporary password.`);
      setNewUser({ name: "", email: "", phone: "", role: "GUIDE" });
      setShowCreateForm(false);
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not create the user.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateUser(user: User) {
    setFormError("");
    try {
      const updatedUser = await updateUser(user.id, { name: user.name, email: user.email, phone: user.phone, role: user.role });
      setUsers((currentUsers) => currentUsers.map((currentUser) => currentUser.id === updatedUser.id ? updatedUser : currentUser));
      setEditingUserId(null);
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not update the user.");
    }
  }

  async function handleResendInvitation(user: User) {
    if (!await confirm({ title: `Send ${user.name} a new invitation?`, message: "The temporary password sent before stops working.", confirmLabel: "Send invitation" })) return;
    setFormError("");
    setNotice("");
    try {
      await resendInvitation(user.id);
      setNotice(`New invitation sent to ${user.email} with a new temporary password.`);
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not resend the invitation.");
      // The user may have chosen a password meanwhile: refresh the list.
      listUsers().then(setUsers).catch(() => undefined);
    }
  }

  async function handleCloseSessions(user: User) {
    if (!await confirm({ title: `Sign ${user.name} out on every device?`, message: "They can sign in again with their password.", confirmLabel: "Sign out everywhere" })) return;
    setFormError("");
    setNotice("");
    try {
      await closeUserSessions(user.id);
      setNotice(`${user.name} was signed out on every device.`);
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not close the sessions.");
    }
  }

  async function handleDeletePermanently(user: User) {
    if (!await confirm({ title: `Delete ${user.name} permanently?`, message: `Their personal data is erased and cannot be recovered; the history keeps "Deleted ${user.role === "GUIDE" ? "guide" : "user"}" in their place.`, confirmLabel: "Delete permanently", tone: "danger" })) return;
    setFormError("");
    setNotice("");
    try {
      await deleteUserPermanently(user.id);
      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
      setNotice(`${user.name} was deleted permanently.`);
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not delete the user.");
    }
  }

  async function handleDeactivateUser(user: User) {
    const days = user.role === "GUIDE" ? " Their tour days not yet paid will go back to pending assignment." : "";
    if (!await confirm({ title: `Deactivate ${user.name}?`, message: `They can no longer sign in.${days}`, confirmLabel: "Deactivate", tone: "danger" })) return;
    try {
      await deactivateUser(user.id);
      setUsers((currentUsers) => currentUsers.map((currentUser) => currentUser.id === user.id ? { ...currentUser, is_active: false } : currentUser));
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Could not deactivate the user.");
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Users" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Users" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
                <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">WORKSPACE / ACCESS</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Users</h1>
                <p className="mt-2 max-w-[540px] text-[11px] text-[#85867c]">Manage who can access the INARI workspace and what they are responsible for.</p>
              </header>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[["Workspace users", "08", "All invited members"], ["Active now", "06", "Using the workspace"], ["Agency partners", "03", "External access"], ["Pending invites", "02", "Awaiting acceptance"]].map(([label, value, note]) => <article key={label} className="min-h-[100px] bg-white p-4"><p className="text-[9px] text-[#8b8c82]">{label}</p><p className="mt-3 font-serif text-2xl leading-none">{value}</p><p className="mt-2 text-[8px] text-[#aaa99f]">{note}</p></article>)}
              </div>

              <section className="mt-5 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 border-b border-[#ecebe5] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div><h2 className="font-serif text-xl">Workspace access</h2><p className="mt-2 text-[9px] text-[#96968b]">Roles and recent activity across your team</p></div>
                  <button type="button" onClick={() => setShowCreateForm((current) => !current)} className="h-9 bg-[#292b26] px-4 text-[9px] font-medium text-white hover:bg-[#3a3d34]">+ Add user</button>
                </div>
                {notice && <p role="status" className="mt-5 border border-[#e3e1da] bg-[#f8f7f3] p-3 text-[10px] text-[#55574f]">{notice}</p>}{showCreateForm && <form onSubmit={handleCreateUser} className="mt-5 grid gap-3 border-b border-[#ecebe5] pb-5 sm:grid-cols-2 lg:grid-cols-5"><input aria-label="Name" value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="Name" className="h-9 border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none" /><input aria-label="Email" type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="Email" className="h-9 border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none" /><input aria-label="Phone" value={newUser.phone} onChange={(event) => setNewUser({ ...newUser, phone: event.target.value })} placeholder="Phone" className="h-9 border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none" /><Select ariaLabel="Role" value={newUser.role} onChange={(role) => setNewUser({ ...newUser, role: role as UserRole })} options={[{ value: "GUIDE", label: "Guide" }, { value: "ADMIN", label: "Admin" }]} className="h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]" /><button type="submit" disabled={isCreating} className="h-9 bg-[#e9e5d7] px-3 text-[9px] disabled:opacity-60">{isCreating ? "Creating..." : "Create"}</button>{formError && <p role="alert" className="text-[10px] text-[#9b6f37] sm:col-span-2 lg:col-span-5">{formError}</p>}</form>}
                <div className="mt-5 flex gap-3"><label className="flex-1 text-[9px]"><span className="mb-2 block">Search users</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email or role..." className="h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none placeholder:text-[#aaa99f] focus:border-[#b5a786]" /></label><button type="button" onClick={() => setQuery("")} className="mt-[19px] h-9 border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]">Reset</button></div>
                {isLoading && <p className="mt-6 text-[10px] text-[#85867c]">Loading users...</p>}
                {error && <p role="alert" className="mt-6 text-[10px] text-[#9b6f37]">{error}</p>}
                {!isLoading && !error && filteredUsers.length === 0 && <p className="mt-6 text-[10px] text-[#85867c]">No users found.</p>}
                {!isLoading && !error && filteredUsers.length > 0 && <UserTable users={filteredUsers} editingUserId={editingUserId} onEdit={setEditingUserId} onSave={handleUpdateUser} onDeactivate={handleDeactivateUser} onResendInvitation={handleResendInvitation} onCloseSessions={handleCloseSessions} onDeletePermanently={handleDeletePermanently} />}
                <p className="mt-5 text-[9px] text-[#96968b]">{filteredUsers.length} users shown · Access managed by operations</p>
              </section>
              <footer className="pt-8 text-[9px] tracking-[0.03em] text-[#a09f94]">DEMO WORKSPACE · Sample operational data · Not connected to live services</footer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function UserTable({ users: items, editingUserId, onEdit, onSave, onDeactivate, onResendInvitation, onCloseSessions, onDeletePermanently }: { users: User[]; editingUserId: string | null; onEdit: (id: string | null) => void; onSave: (user: User) => void; onDeactivate: (user: User) => void; onResendInvitation: (user: User) => void; onCloseSessions: (user: User) => void; onDeletePermanently: (user: User) => void }) {
  return <div className="mt-6 overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[minmax(220px,1.5fr)_minmax(190px,1.2fr)_minmax(125px,0.9fr)_110px_80px_150px] gap-3 border-b border-[#ecebe5] pb-3 text-[8px] font-semibold tracking-[0.16em] text-[#a19a87]"><span>USER</span><span>EMAIL</span><span>ROLE</span><span>CREATED</span><span>STATUS</span><span>ACTIONS</span></div><div className="divide-y divide-[#f0efe9]">{items.map((user) => editingUserId === user.id ? <EditableUserRow key={user.id} user={user} onCancel={() => onEdit(null)} onSave={onSave} /> : <div key={user.id} className="grid grid-cols-[minmax(220px,1.5fr)_minmax(190px,1.2fr)_minmax(125px,0.9fr)_110px_80px_150px] items-center gap-3 py-4 text-[9px] hover:bg-[#fbfaf7]"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9e5d7] text-[8px] text-[#77786f]">{user.name.split(" ").map((part) => part[0]).join("")}</span><span className="text-[10px]">{user.name}</span></div><span className="text-[8px] text-[#85867c]">{user.email}</span><span>{user.role}</span><span className="text-[8px] text-[#85867c]">{new Date(user.created_at).toLocaleDateString()}</span><span className={`px-2 py-1 text-center text-[8px] ${!user.is_active ? "bg-[#f2e8d8] text-[#9b6f37]" : user.invitation_pending ? "bg-[#e9e5d7] text-[#77786f]" : "bg-[#eef0e9] text-[#68705d]"}`}>{!user.is_active ? "Inactive" : user.invitation_pending ? "Invited" : "Active"}</span><span className="flex flex-wrap gap-x-2 gap-y-1 text-[8px]"><button type="button" onClick={() => onEdit(user.id)} className="underline underline-offset-2">Edit</button>{user.is_active && user.invitation_pending && <button type="button" onClick={() => onResendInvitation(user)} className="underline underline-offset-2">Resend invite</button>}{user.is_active && !user.invitation_pending && <button type="button" onClick={() => onCloseSessions(user)} className="underline underline-offset-2">Sign out</button>}{user.is_active && <button type="button" onClick={() => onDeactivate(user)} className="text-[#9b6f37] underline underline-offset-2">Deactivate</button>}{!user.is_active && <button type="button" onClick={() => onDeletePermanently(user)} className="text-[#9b6f37] underline underline-offset-2">Delete permanently</button>}</span></div>)}</div></div></div>;
}

function EditableUserRow({ user, onCancel, onSave }: { user: User; onCancel: () => void; onSave: (user: User) => void }) {
  const [draft, setDraft] = useState(user);
  const inputClass = "h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-[9px] text-[#292b26] outline-none transition-colors focus:border-[#b5a786]";
  return <div className="grid grid-cols-[minmax(220px,1.5fr)_minmax(190px,1.2fr)_minmax(125px,0.9fr)_110px_80px_150px] items-center gap-3 bg-white py-3 text-[9px]"><input aria-label="Edit name" placeholder="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /><input aria-label="Edit email" type="email" placeholder="Email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /><Select ariaLabel="Edit role" value={draft.role} onChange={(role) => setDraft({ ...draft, role: role as UserRole })} options={[{ value: "GUIDE", label: "Guide" }, { value: "ADMIN", label: "Admin" }]} className={inputClass} /><span /><span /><span className="flex items-center gap-1.5 text-[8px]"><button type="button" onClick={() => onSave(draft)} className="h-9 bg-[#292b26] px-2.5 font-medium text-white hover:bg-[#3a3d34]">Save</button><button type="button" onClick={onCancel} className="h-9 border border-[#deddd6] bg-white px-2.5 text-[#77786f] hover:bg-[#f8f7f3]">Cancel</button></span></div>;
}
