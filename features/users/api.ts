import { request, type Session } from "@/lib/api/client";

export type UserRole = "ADMIN" | "GUIDE";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  /** True while the user has not chosen a password: the invitation can be sent again. Only in the users list. */
  invitation_pending?: boolean;
};

export type CreateUserInput = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
};

export type UserCredentials = {
  User: User;
  AuthCredentials: {
    user_id: string;
    must_change_password: boolean;
    is_active: boolean;
  };
};

export type UpdateUserInput = Partial<Pick<User, "name" | "email" | "phone" | "role">>;

export function listUsers() {
  return request<User[]>("/users");
}

export function getUser(id: string) {
  return request<User>(`/users/${id}`);
}

export function createUser(input: CreateUserInput) {
  return request<UserCredentials>("/users", { method: "POST", body: JSON.stringify(input) });
}

export function updateUser(id: string, input: UpdateUserInput) {
  return request<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** Emails a new temporary password to a user who has not chosen a password yet. */
export function resendInvitation(id: string) {
  return request<UserCredentials>(`/users/${id}/invitation`, { method: "POST" });
}

/** Signs the user out on every device; they can sign in again. */
export function closeUserSessions(id: string) {
  return request<void>(`/users/${id}/sessions`, { method: "DELETE" });
}

/** Erases a deactivated user's personal data for good; the history keeps a "Deleted guide/user" in their place. */
export function deleteUserPermanently(id: string) {
  return request<void>(`/users/${id}/permanently`, { method: "DELETE" });
}

export function deactivateUser(id: string) {
  return request<void>(`/users/${id}`, { method: "DELETE" });
}

export function getGuideUsers() {
  return request<Array<{ id: string; user_id: string; name: string; email: string; phone: string; max_tours_per_day: number; created_at: string }>>("/users/guides");
}

export function canManageUsers(session: Session | null) {
  return session?.role === "ADMIN";
}
