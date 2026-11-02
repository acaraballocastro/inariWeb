export class ApiError extends Error {
  status: number;
  /** Stable backend error code, e.g. "RESERVATION_NOT_FOUND". */
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9142/api/v1").replace(/\/$/, "");
const sessionStorageKey = "inari.session";

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
  code?: string;
};

export type Session = {
  userId: string;
  role: string;
  mustChangePassword: boolean;
};

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;

  const storedSession = window.localStorage.getItem(sessionStorageKey);
  if (!storedSession) return null;

  try {
    return JSON.parse(storedSession) as Session;
  } catch {
    window.localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(sessionStorageKey);
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { ...options, headers, credentials: "include" });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor.", 0);
  }

  const bodyText = await response.text();
  let body: unknown = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearSession();
    }
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : typeof body === "string" && body
        ? body
        : "La operación no pudo completarse.";
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : undefined;
    // A user still on the temporary password may only change it.
    if (code === "PASSWORD_CHANGE_REQUIRED" && typeof window !== "undefined") {
      const session = getSession();
      if (session) saveSession({ ...session, mustChangePassword: true });
      // request() runs outside components, with no router: a full navigation is intended.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (window.location.pathname !== "/change-password") window.location.assign("/change-password");
    }
    throw new ApiError(message, response.status, code);
  }

  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as ApiEnvelope<T>).data as T;
  }

  return body as T;
}

export { apiUrl };
