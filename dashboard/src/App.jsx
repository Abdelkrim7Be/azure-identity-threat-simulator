import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import AttackTimeline from "./components/AttackTimeline.jsx";
import AlertPanel from "./components/AlertPanel.jsx";

const ThreatMap = lazy(() => import("./components/ThreatMap.jsx"));

const API_BASE = "http://localhost:5000";

function badgeColor(result) {
  if (result === "success")
    return "text-neon-green border-neon-green/40 bg-neon-green/10";
  if (result === "blocked")
    return "text-neon-red border-neon-red/40 bg-neon-red/10";
  if (result === "failed")
    return "text-amber-300 border-amber-300/40 bg-amber-300/10";
  return "text-slate-200 border-white/10 bg-white/5";
}

async function api(path, init) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function kpiCardTone(type) {
  if (type === "critical")
    return "border-neon-red/35 bg-neon-red/10 text-neon-red";
  if (type === "warning")
    return "border-amber-300/35 bg-amber-300/10 text-amber-200";
  if (type === "detection")
    return "border-sky-400/35 bg-sky-400/10 text-sky-300";
  if (type === "status")
    return "border-neon-green/30 bg-neon-green/10 text-neon-green";
  return "border-white/10 bg-white/5 text-slate-100";
}

export default function App() {
  const [status, setStatus] = useState({
    running: false,
    event_count: 0,
    config: {},
  });
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(true);
  const [activeView, setActiveView] = useState("operations");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timelineClearedAt, setTimelineClearedAt] = useState(null);

  const counts = useMemo(() => {
    const out = { critical: 0, warning: 0, info: 0 };
    for (const e of events) out[e.severity] = (out[e.severity] || 0) + 1;
    return out;
  }, [events]);

  const detectionSeconds = useMemo(() => {
    if (!events.length) return null;
    const firstCritical = events.find((e) => e.severity === "critical");
    if (!firstCritical) return null;
    const firstBlocked = events.find((e) => e.result === "blocked");
    const startTs = new Date(firstCritical.ts).getTime();
    const endTs = new Date(
      (firstBlocked || events[events.length - 1]).ts,
    ).getTime();
    if (Number.isNaN(startTs) || Number.isNaN(endTs) || endTs < startTs)
      return null;
    return Math.round((endTs - startTs) / 1000);
  }, [events]);

  const globalStatus = useMemo(() => {
    if (status.running) return "ATTACKING";
    const hadBlock = events.some(
      (e) => e.result === "blocked" || e.result === "stopped",
    );
    return hadBlock ? "BLOCKED" : "IDLE";
  }, [events, status.running]);

  const timelineEvents = useMemo(() => {
    if (!timelineClearedAt) return events;
    return events.filter((e) => new Date(e.ts).getTime() > timelineClearedAt);
  }, [events, timelineClearedAt]);

  async function refresh() {
    try {
      setError(null);
      const [s, ev] = await Promise.all([api("/status"), api("/events")]);
      setStatus(s);
      setEvents(ev);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!polling) return;
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [polling]);

  async function startAttack() {
    try {
      setError(null);
      await api("/start-attack", { method: "POST", body: "{}" });
      await refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function stopAttack() {
    try {
      setError(null);
      await api("/stop-attack", { method: "POST", body: "{}" });
      await refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function resetAll() {
    try {
      setError(null);
      await api("/reset", { method: "POST", body: "{}" });
      setEvents([]);
      await refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  return (
    <div className="h-screen overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" />

      <div
        className={`relative flex h-full transition-[padding-left] duration-300 ${
          sidebarOpen ? "md:pl-72" : "pl-0"
        }`}
      >
        <aside
          className={`glass fixed left-0 top-0 z-20 flex h-screen w-full max-w-72 flex-col justify-between border-r border-white/10 p-5 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Views
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
              >
                Hide
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => setActiveView("operations")}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  activeView === "operations"
                    ? "border-neon-green/35 bg-neon-green/10 text-neon-green"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                Operations
              </button>
              <button
                onClick={() => setActiveView("analytics")}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  activeView === "analytics"
                    ? "border-sky-400/35 bg-sky-400/10 text-sky-300"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                Threat Analytics
              </button>
            </div>
          </div>
          <div className="space-y-2 text-[11px] text-slate-500">
            <div>Azure Threat Simulation Lab</div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[11px] leading-relaxed text-slate-300">
              API: <span className="text-slate-100">{API_BASE}</span>
              <br />
              RG:{" "}
              <span className="text-slate-100">
                {status?.config?.resource_group || "-"}
              </span>
            </div>
          </div>
        </aside>

        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-3 top-3 z-30 rounded-lg border border-neon-green/35 bg-neon-green/10 px-3 py-2 text-xs font-medium text-neon-green hover:bg-neon-green/20"
          >
            Open Panel
          </button>
        ) : null}

        <main className="flex h-full flex-1 flex-col overflow-hidden p-3 pr-2">
          <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-neon-green/80 shadow-[0_0_12px_rgba(57,255,20,0.6)]" />
                Azure Threat Simulation Lab
              </div>
              <h1 className="mt-1 text-2xl font-semibold text-slate-100">
                Identity Attack Telemetry Dashboard
              </h1>
            </div>

            <div className="glass flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status</span>
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-medium ${badgeColor(
                    status.running ? "success" : "stopped",
                  )}`}
                >
                  {status.running ? "RUNNING" : "IDLE"}
                </span>
              </div>
              <div
                className={`rounded-md border px-2 py-1 text-xs font-medium ${
                  globalStatus === "ATTACKING"
                    ? "border-neon-red/40 bg-neon-red/15 text-neon-red"
                    : globalStatus === "BLOCKED"
                      ? "border-neon-green/35 bg-neon-green/15 text-neon-green"
                      : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {globalStatus}
              </div>

              <div className="h-6 w-px bg-white/10" />

              <button
                onClick={startAttack}
                disabled={status.running}
                className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-3 py-2 text-sm font-medium text-neon-green hover:bg-neon-green/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Attack
              </button>
              <button
                onClick={stopAttack}
                disabled={!status.running}
                className="rounded-lg border border-neon-red/30 bg-neon-red/10 px-3 py-2 text-sm font-medium text-neon-red hover:bg-neon-red/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stop
              </button>
              <button
                onClick={resetAll}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                Reset
              </button>

              <div className="h-6 w-px bg-white/10" />

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={polling}
                  onChange={(e) => setPolling(e.target.checked)}
                  className="h-4 w-4 accent-neon-green"
                />
                Live polling
              </label>
            </div>
          </header>

          {error ? (
            <div className="mt-5 rounded-xl border border-neon-red/35 bg-neon-red/10 px-4 py-3 text-sm text-slate-100">
              <div className="font-medium text-neon-red">API error</div>
              <div className="mt-1 text-slate-200">{error}</div>
              <div className="mt-2 text-xs text-slate-400">
                Check that the Flask API is running and allows localhost CORS.
              </div>
            </div>
          ) : null}

          <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div
              className={`glass rounded-xl border p-3 ${kpiCardTone("critical")}`}
            >
              <div className="text-xs uppercase tracking-wider text-slate-300">
                Critical Alerts
              </div>
              <div className="mt-1 text-xl font-semibold">
                {counts.critical}
              </div>
            </div>
            <div
              className={`glass rounded-xl border p-3 ${kpiCardTone("warning")}`}
            >
              <div className="text-xs uppercase tracking-wider text-slate-300">
                Warnings
              </div>
              <div className="mt-1 text-xl font-semibold">{counts.warning}</div>
            </div>
            <div
              className={`glass rounded-xl border p-3 ${kpiCardTone("detection")}`}
            >
              <div className="text-xs uppercase tracking-wider text-slate-300">
                Detection Time
              </div>
              <div className="mt-1 text-xl font-semibold">
                {detectionSeconds === null ? "--" : `${detectionSeconds}s`}
              </div>
            </div>
            <div
              className={`glass rounded-xl border p-3 ${kpiCardTone("status")}`}
            >
              <div className="text-xs uppercase tracking-wider text-slate-300">
                Global Status
              </div>
              <div className="mt-1 text-xl font-semibold">{globalStatus}</div>
            </div>
          </section>

          <div className="mt-4 min-h-0 flex-1 overflow-auto pb-2">
            {activeView === "operations" ? (
              <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="min-h-0 lg:col-span-7">
                  <AttackTimeline
                    events={timelineEvents}
                    onClearTimeline={() => setTimelineClearedAt(Date.now())}
                  />
                </div>
                <div className="min-h-0 lg:col-span-5">
                  <AlertPanel events={events} counts={counts} />
                </div>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="glass rounded-2xl p-4 text-sm text-slate-300">
                    Loading analytics...
                  </div>
                }
              >
                <ThreatMap events={events} />
              </Suspense>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
