import { request } from "@/lib/api/client";

export type WorkerStats = {
  name: string;
  interval: string;
  runs: number;
  failures: number;
  consecutive_failures: number;
  last_run_at: string | null;
  last_duration_ms: number;
  last_result: { Found: number; Processed: number; Failed: number };
  last_error?: string;
  last_error_at?: string;
};

export type RouteSummary = {
  route: string;
  requests: number;
  client_errors: number;
  server_errors: number;
  avg_ms: number;
  p95_ms: number;
  max_ms: number;
  last_at: string;
};

export type ErrorEntry = {
  at: string;
  source: "http" | "worker";
  route?: string;
  status?: number;
  request_id?: string;
  user_id?: string;
  message: string;
};

export type SystemSnapshot = {
  status: "ok" | "degraded";
  started_at: string;
  uptime_seconds: number;
  version: string;
  go_version: string;
  database: { up: boolean; ping_ms: number; open_connections: number; in_use: number; idle: number; wait_count: number; wait_ms: number };
  runtime: { goroutines: number; heap_mb: number; system_mb: number; gc_runs: number; cpus: number; max_procs: number };
  requests: { total: number; client_errors: number; server_errors: number };
  routes: RouteSummary[];
  workers: WorkerStats[];
  recent_errors: ErrorEntry[];
};

/** The state of the API since its last start (ADMIN only). */
export function getSystemSnapshot() {
  return request<SystemSnapshot>("/admin/system");
}
