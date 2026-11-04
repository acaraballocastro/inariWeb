"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { getSystemSnapshot, type SystemSnapshot } from "@/features/system/api";
import { formatJst } from "@/lib/datetime";

const refreshEveryMs = 15_000;

export function SystemScreen() {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(() => {
    getSystemSnapshot()
      .then((data) => { setSnapshot(data); setError(""); setUpdatedAt(new Date()); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load the system status."));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, refreshEveryMs);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="System" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / System" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="flex flex-col gap-4 border-b border-[#deddd6] pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-10">
                <div>
                  <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">WORKSPACE / OPERATIONS</p>
                  <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">System</h1>
                  <p className="mt-2 max-w-[560px] text-lead text-[#85867c]">Health of the API since its last start. Counters reset when the server restarts.</p>
                </div>
                <div className="flex items-center gap-3 text-meta text-[#85867c]">
                  {updatedAt && <span>Updated {formatJst(updatedAt, { hour: "2-digit", minute: "2-digit", second: "2-digit" })} JST · every 15 s</span>}
                  <button type="button" onClick={load} className="h-8 border border-[#deddd6] px-3 hover:bg-[#f8f7f3]">Refresh</button>
                </div>
              </header>

              {error && <p role="alert" className="mt-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
              {!snapshot && !error && <p className="mt-6 text-body text-[#85867c]">Loading…</p>}
              {snapshot && <SystemDetails snapshot={snapshot} />}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SystemDetails({ snapshot }: { snapshot: SystemSnapshot }) {
  const failingWorkers = snapshot.workers.filter((worker) => worker.consecutive_failures > 0).length;
  const errorRate = snapshot.requests.total ? (snapshot.requests.server_errors / snapshot.requests.total) * 100 : 0;
  const cards: Array<[string, string, string, boolean]> = [
    ["Status", snapshot.status === "ok" ? "OK" : "Degraded", snapshot.status === "ok" ? "Database and workers healthy" : failingWorkers ? `${failingWorkers} worker(s) failing` : "Database not answering", snapshot.status !== "ok"],
    ["Uptime", formatUptime(snapshot.uptime_seconds), `Version ${snapshot.version} · ${snapshot.go_version}`, false],
    ["Requests", snapshot.requests.total.toLocaleString("en-GB"), `${snapshot.requests.client_errors} client errors · ${snapshot.requests.server_errors} server errors`, false],
    ["Server error rate", `${errorRate.toFixed(errorRate && errorRate < 1 ? 2 : 0)} %`, "Share of requests answered 5xx", snapshot.requests.server_errors > 0],
  ];

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value, note, warn]) => (
          <article key={label} className={`min-h-[100px] p-4 ${warn ? "bg-[#fbf6ef]" : "bg-white"}`}>
            <p className="text-meta text-[#8b8c82]">{label}</p>
            <p className={`mt-3 font-serif text-2xl leading-none ${warn ? "text-[#9b6f37]" : ""}`}>{value}</p>
            <p className="mt-2 text-label text-[#aaa99f]">{note}</p>
          </article>
        ))}
      </div>

      <section className="mt-5 bg-white p-5 sm:p-6">
        <h2 className="font-serif text-xl">Background workers</h2>
        <p className="mt-2 text-meta text-[#96968b]">They run at start-up and then on every interval; a failed run is retried on the next one.</p>
        <Table headers={["WORKER", "EVERY", "LAST RUN", "DURATION", "LAST RESULT", "RUNS / FAILURES", "STATE"]} minWidth={760}>
          {snapshot.workers.map((worker) => (
            <tr key={worker.name} className="border-t border-[#f0efe9] align-top">
              <Cell strong>{worker.name}</Cell>
              <Cell>{worker.interval}</Cell>
              <Cell>{worker.last_run_at ? formatTime(worker.last_run_at) : "Not yet"}</Cell>
              <Cell>{worker.last_run_at ? `${worker.last_duration_ms.toFixed(0)} ms` : "—"}</Cell>
              <Cell>{`${worker.last_result.Processed}/${worker.last_result.Found} processed${worker.last_result.Failed ? ` · ${worker.last_result.Failed} failed` : ""}`}</Cell>
              <Cell>{`${worker.runs} / ${worker.failures}`}</Cell>
              <Cell>{worker.consecutive_failures > 0
                ? <span className="text-[#9b6f37]">Failing ×{worker.consecutive_failures}<span className="mt-1 block max-w-[260px] break-words text-label text-[#85867c]">{worker.last_error}</span></span>
                : <span className="text-[#68705d]">OK</span>}</Cell>
            </tr>
          ))}
        </Table>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="bg-white p-5 sm:p-6">
          <h2 className="font-serif text-xl">Database</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-body">
            <Stat label="State" value={snapshot.database.up ? "Up" : "Down"} warn={!snapshot.database.up} />
            <Stat label="Ping" value={`${snapshot.database.ping_ms.toFixed(1)} ms`} />
            <Stat label="Connections open / in use" value={`${snapshot.database.open_connections} / ${snapshot.database.in_use}`} />
            <Stat label="Waited for a connection" value={`${snapshot.database.wait_count} times · ${snapshot.database.wait_ms.toFixed(0)} ms`} warn={snapshot.database.wait_count > 0} />
          </dl>
        </section>
        <section className="bg-white p-5 sm:p-6">
          <h2 className="font-serif text-xl">Process</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-body">
            <Stat label="Memory in use" value={`${snapshot.runtime.heap_mb.toFixed(1)} MB`} />
            <Stat label="Memory from the system" value={`${snapshot.runtime.system_mb.toFixed(1)} MB`} />
            <Stat label="Goroutines" value={String(snapshot.runtime.goroutines)} />
            <Stat label="Started" value={formatTime(snapshot.started_at)} />
          </dl>
        </section>
      </div>

      <section className="mt-5 bg-white p-5 sm:p-6">
        <h2 className="font-serif text-xl">Latest errors</h2>
        <p className="mt-2 text-meta text-[#96968b]">Server errors and failed worker runs, newest first. Search the request ID in the logs (<code>docker compose logs api | grep &lt;id&gt;</code>) for the full line.</p>
        {snapshot.recent_errors.length === 0
          ? <p className="mt-5 text-body text-[#68705d]">No errors since the last start.</p>
          : <Table headers={["WHEN", "WHERE", "STATUS", "REQUEST ID", "MESSAGE"]} minWidth={760}>
              {snapshot.recent_errors.map((entry, index) => (
                <tr key={`${entry.at}-${index}`} className="border-t border-[#f0efe9] align-top">
                  <Cell>{formatTime(entry.at)}</Cell>
                  <Cell strong>{entry.route ?? entry.source}</Cell>
                  <Cell>{entry.status ?? (entry.source === "worker" ? "worker" : "—")}</Cell>
                  <Cell><span className="font-mono text-label">{entry.request_id ?? "—"}</span></Cell>
                  <Cell><span className="block max-w-[420px] break-words">{entry.message || "—"}</span></Cell>
                </tr>
              ))}
            </Table>}
      </section>

      <section className="mt-5 bg-white p-5 sm:p-6">
        <h2 className="font-serif text-xl">Requests by route</h2>
        <p className="mt-2 text-meta text-[#96968b]">Busiest first. p95: 95 % of the requests took at most this long.</p>
        <Table headers={["ROUTE", "REQUESTS", "4XX", "5XX", "AVG", "P95", "MAX", "LAST"]} minWidth={820}>
          {snapshot.routes.map((route) => (
            <tr key={route.route} className="border-t border-[#f0efe9]">
              <Cell strong><span className="font-mono text-label">{route.route}</span></Cell>
              <Cell>{route.requests.toLocaleString("en-GB")}</Cell>
              <Cell>{route.client_errors}</Cell>
              <Cell>{route.server_errors ? <span className="text-[#9b6f37]">{route.server_errors}</span> : 0}</Cell>
              <Cell>{`${route.avg_ms.toFixed(0)} ms`}</Cell>
              <Cell>{`${route.p95_ms.toFixed(0)} ms`}</Cell>
              <Cell>{`${route.max_ms.toFixed(0)} ms`}</Cell>
              <Cell>{formatTime(route.last_at)}</Cell>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

function Table({ headers, minWidth, children }: { headers: string[]; minWidth: number; children: React.ReactNode }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-left" style={{ minWidth }}>
        <thead><tr>{headers.map((header) => <th key={header} className="pb-3 text-label font-semibold tracking-[0.16em] text-[#a19a87]">{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`py-3 pr-3 text-meta ${strong ? "text-[#292b26]" : "text-[#66685f]"}`}>{children}</td>;
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return <div><dt className="text-label text-[#8b8c82]">{label}</dt><dd className={`mt-1 text-lead ${warn ? "text-[#9b6f37]" : ""}`}>{value}</dd></div>;
}

function formatTime(value: string) {
  return formatJst(value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
