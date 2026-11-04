import { clearSession, getSession, request, saveSession, type Session } from "@/lib/api/client";
import { forgetDevice } from "@/features/notifications/push";
import type { User } from "@/features/users/api";

/** The signed-in user, for any role. The role that counts is the one in the database, so the session follows it. */
export async function getMe() {
  const user = await request<User>("/auth/me");
  const session = getSession();
  if (session && session.role !== user.role) saveSession({ ...session, role: user.role });
  return user;
}

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

/** Signs the user out on every device, this one included. */
export async function logoutEverywhere() {
  try {
    await forgetDevice();
    await request<void>("/auth/logout-all", { method: "POST" });
  } finally {
    clearSession();
  }
}

export async function logout() {
  try {
    await forgetDevice();
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}

/** Asks for a password reset email. The backend answers the same whether the account exists or not. */
export async function requestPasswordReset(email: string) {
  await request<void>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  await request<void>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}
