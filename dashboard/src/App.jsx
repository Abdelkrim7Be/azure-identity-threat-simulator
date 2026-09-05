import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import AttackTimeline from "./components/AttackTimeline.jsx";
import AlertPanel from "./components/AlertPanel.jsx";

const ThreatMap = lazy(() => import("./components/ThreatMap.jsx"));

const API_BASE = "http://localhost:5000";

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
  if (type === "critical") return "text-red-300";
  if (type === "warning") return "text-amber-300";
  if (type === "detection") return "text-slate-100";
  if (type === "status") return "text-slate-100";
  return "text-slate-100";
}

function statusTone(displayStatus) {
  if (displayStatus === "Running") return "bg-sky-400";
  if (displayStatus === "Stopped") return "bg-amber-400";
  if (displayStatus === "Failed") return "bg-red-400";
  if (displayStatus === "Complete") return "bg-emerald-400";
  return "bg-emerald-400";
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

  const simulationState = useMemo(() => {
    if (status.running) return "Running";
    const latest = events.length ? events[events.length - 1] : null;
    if (!latest) return "Ready";
    if (latest.result === "stopped") return "Stopped";
    if (latest.result === "blocked" || latest.result === "failed")
      return "Failed";
    if (latest.step === "Simulation complete") return "Complete";
    return "Ready";
  }, [events, status.running]);

  const timelineEvents = useMemo(() => {
    if (!timelineClearedAt) return events;
    return events.filter((e) => new Date(e.ts).getTime() > timelineClearedAt);
  }, [events, timelineClearedAt]);

  const latestEvent = events.length ? events[events.length - 1] : null;

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
    <div className="relative h-screen overflow-hidden bg-[#070b14] text-slate-200">
      <div
        className={`relative flex h-full transition-[padding-left] duration-200 ${
          sidebarOpen ? "md:pl-60" : "pl-0"
        }`}
      >
        <aside
          className={`fixed left-0 top-0 z-20 flex h-screen w-full max-w-60 flex-col justify-between border-r border-slate-800/80 bg-[#0b1220]/95 p-4 transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-identity max-w-40 text-[16px] font-normal leading-5 text-slate-50">
                  Azure Threat Simulation Lab
                </div>
                <div className="mt-1 text-[14px] text-slate-400">
                  Local simulation workspace
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="btn btn-quiet h-8 px-2 text-[13px]"
              >
                Collapse
              </button>
            </div>
            <nav className="mt-7 space-y-1">
              <button
                onClick={() => setActiveView("operations")}
                className={`nav-button w-full text-left text-[14px] font-normal ${
                  activeView === "operations"
                    ? "nav-button-active"
                    : "nav-button-idle"
                }`}
              >
                Operations
              </button>
              <button
                onClick={() => setActiveView("analytics")}
                className={`nav-button w-full text-left text-[14px] font-normal ${
                  activeView === "analytics"
                    ? "nav-button-active"
                    : "nav-button-idle"
                }`}
              >
                Threat Analytics
              </button>
            </nav>
          </div>
          <div className="border-t border-slate-800 pt-3 text-[14px] leading-5 text-slate-500">
            <div className="mb-1 text-slate-500">Lab connection</div>
            <div className="break-words">
              API <span className="text-slate-300">{API_BASE}</span>
            </div>
            <div className="break-words">
              RG <span className="text-slate-300">{status?.config?.resource_group || "-"}</span>
            </div>
          </div>
        </aside>

        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="btn btn-secondary fixed left-3 top-3 z-30 text-[13px]"
          >
            Open Panel
          </button>
        ) : null}

        <main className="relative flex h-full flex-1 flex-col overflow-hidden px-6 py-5">
          <header className="flex flex-col gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-identity text-[29px] font-normal tracking-normal text-slate-50">
                Identity Attack Telemetry Dashboard
              </h1>
              <div className="mt-1 text-[14px] text-slate-400">
                Local simulator events mapped to MITRE ATT&amp;CK phases.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-[#0b1220]/90 px-2.5 py-2">
              <div className="mr-1 flex items-center gap-2 px-1 text-[14px] text-slate-300">
                <span className={`h-2 w-2 rounded-full ${statusTone(simulationState)}`} />
                <span>{simulationState}</span>
              </div>

              <button
                onClick={startAttack}
                disabled={status.running}
                className="btn btn-primary text-[14px]"
              >
                Start Simulation
              </button>
              <button
                onClick={stopAttack}
                disabled={!status.running}
                className="btn btn-danger text-[14px]"
              >
                Stop
              </button>
              <button
                onClick={resetAll}
                className="btn btn-secondary text-[14px]"
              >
                Reset
              </button>

              <label className="ml-1 flex cursor-pointer items-center gap-2 border-l border-slate-800 pl-3 text-[14px] text-slate-300">
                <input
                  type="checkbox"
                  checked={polling}
                  onChange={(e) => setPolling(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="toggle-track" aria-hidden="true">
                  <span className="toggle-thumb" />
                </span>
                Polling
              </label>
            </div>
          </header>

          {error ? (
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-950/35 px-4 py-3 text-[15px] text-red-100">
              <div className="font-normal text-red-300">API error</div>
              <div className="mt-1">{error}</div>
              <div className="mt-2 text-[13px] text-red-200/80">
                Check that the Flask API is running and allows localhost CORS.
              </div>
            </div>
          ) : null}

          <section className="mt-4 rounded-md border border-slate-800 bg-[#0b1220]/92">
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-800 text-[14px] text-slate-400 md:grid-cols-5 md:divide-y-0">
              <div className="px-4 py-3">
                <div>Events</div>
                <div className="mt-1 text-[20px] text-slate-50">{events.length}</div>
              </div>
              <div className="px-4 py-3">
                <div>Critical</div>
                <div className={`mt-1 text-[20px] ${kpiCardTone("critical")}`}>
                  {counts.critical}
                </div>
              </div>
              <div className="px-4 py-3">
                <div>Warnings</div>
                <div className={`mt-1 text-[20px] ${kpiCardTone("warning")}`}>
                  {counts.warning}
                </div>
              </div>
              <div className="px-4 py-3">
                <div>Detection</div>
                <div className={`mt-1 text-[20px] ${kpiCardTone("detection")}`}>
                  {detectionSeconds === null ? "--" : `${detectionSeconds}s`}
                </div>
              </div>
              <div className="px-4 py-3">
                <div>State</div>
                <div className={`mt-1 flex items-center gap-2 text-[20px] ${kpiCardTone("status")}`}>
                  <span className={`h-2 w-2 rounded-full ${statusTone(simulationState)}`} />
                  {simulationState}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-px border-t border-slate-800 bg-slate-800 text-[14px] text-slate-400 md:grid-cols-4">
              <div className="bg-[#0b1220] px-4 py-2">
                Last event <span className="text-slate-200">{latestEvent ? latestEvent.step : "none"}</span>
              </div>
              <div className="bg-[#0b1220] px-4 py-2">
                Key Vault <span className="text-slate-200">{status?.config?.keyvault_name || "-"}</span>
              </div>
              <div className="bg-[#0b1220] px-4 py-2">
                Storage <span className="text-slate-200">{status?.config?.storage_account_name || "-"}</span>
              </div>
              <div className="bg-[#0b1220] px-4 py-2">
                Container <span className="text-slate-200">{status?.config?.storage_container_name || "-"}</span>
              </div>
            </div>
          </section>

          <div className="mt-4 min-h-0 flex-1 overflow-auto pb-2">
            {activeView === "operations" ? (
              <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="min-h-0 xl:col-span-8">
                  <AttackTimeline
                    events={timelineEvents}
                    onClearTimeline={() => setTimelineClearedAt(Date.now())}
                  />
                </div>
                <div className="min-h-0 xl:col-span-4">
                  <AlertPanel events={events} counts={counts} />
                </div>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="rounded-md border border-slate-800 bg-[#0b1220] p-4 text-[15px] text-slate-400">
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
