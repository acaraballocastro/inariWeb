import { clearSession, request, saveSession, type Session } from "@/lib/api/client";

export type LoginResponse = {
  token: string;
  user_id: string;
  role: string;
  must_change_password: boolean;
};

export async function login(email: string, password: string): Promise<Session> {
  const response = await request<LoginResponse>("/auth/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const session: Session = {
    userId: response.user_id,
    role: response.role,
    mustChangePassword: response.must_change_password,
  };
  saveSession(session);
  return session;
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  await request<void>("/auth/", {
    method: "PATCH",
    body: JSON.stringify({ user_id: userId, old_password: oldPassword, new_password: newPassword }),
  });
}

export async function logout() {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}
