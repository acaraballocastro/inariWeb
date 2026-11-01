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

export function deactivateUser(id: string) {
  return request<void>(`/users/${id}`, { method: "DELETE" });
}

export function getGuideUsers() {
  return request<Array<{ id: string; user_id: string; name: string; email: string; phone: string; max_tours_per_day: number; created_at: string }>>("/users/guides");
}

export function canManageUsers(session: Session | null) {
  return session?.role === "ADMIN";
}
