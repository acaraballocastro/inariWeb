"use client";

import { useEffect, useState } from "react";

import { getUser, type User } from "@/features/users/api";
import { getSession } from "@/lib/api/client";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    let active = true;
    getUser(session.userId)
      .then((result) => { if (active) setUser(result); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return user;
}
