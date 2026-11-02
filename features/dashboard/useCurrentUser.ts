"use client";

import { useEffect, useState } from "react";

import { getMe } from "@/features/auth/api";
import type { User } from "@/features/users/api";
import { getSession } from "@/lib/api/client";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getSession()) return;

    let active = true;
    getMe()
      .then((result) => { if (active) setUser(result); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return user;
}
