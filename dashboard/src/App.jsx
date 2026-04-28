import { useEffect, useMemo, useRef, useState } from "react";
import AttackTimeline from "./components/AttackTimeline.jsx";
import AlertPanel from "./components/AlertPanel.jsx";
import ThreatMap from "./components/ThreatMap.jsx";

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

export default function App() {
  const [status, setStatus] = useState({
    running: false,
    event_count: 0,
    config: {},
  });
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(true);
  const lastEventIdRef = useRef(null);

  const counts = useMemo(() => {
    const out = { critical: 0, warning: 0, info: 0 };
    for (const e of events) out[e.severity] = (out[e.severity] || 0) + 1;
    return out;
  }, [events]);

  async function refresh() {
    try {
      setError(null);
      const [s, ev] = await Promise.all([api("/status"), api("/events")]);
      setStatus(s);
      setEvents(ev);
      if (ev?.length) lastEventIdRef.current = ev[ev.length - 1].id;
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
      lastEventIdRef.current = null;
      await refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  return (
    <div className="min-h-screen">
      <div className="grid-bg absolute inset-0 pointer-events-none opacity-70" />

      <div className="relative mx-auto max-w-7xl px-5 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-neon-green/80 shadow-[0_0_12px_rgba(57,255,20,0.6)]" />
              Azure Identity Threat Simulator
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-100">
              Identity Attack Telemetry Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              API: <span className="text-slate-200">{API_BASE}</span> · RG:{" "}
              <span className="text-slate-200">
                {status?.config?.resource_group || "-"}
              </span>
            </p>
          </div>

          <div className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
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

            <div className="h-6 w-px bg-white/10" />

            <button
              onClick={startAttack}
              disabled={status.running}
              className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-3 py-2 text-sm font-medium text-neon-green hover:bg-neon-green/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lancer l’attaque
            </button>
            <button
              onClick={stopAttack}
              disabled={!status.running}
              className="rounded-lg border border-neon-red/30 bg-neon-red/10 px-3 py-2 text-sm font-medium text-neon-red hover:bg-neon-red/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Arrêter
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
              Temps réel
            </label>
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-xl border border-neon-red/35 bg-neon-red/10 px-4 py-3 text-sm text-slate-100">
            <div className="font-medium text-neon-red">Erreur API</div>
            <div className="mt-1 text-slate-200">{error}</div>
            <div className="mt-2 text-xs text-slate-400">
              Vérifie que l’API Flask tourne et que CORS autorise `localhost`.
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <AttackTimeline events={events} />
          </div>
          <div className="lg:col-span-5">
            <AlertPanel events={events} counts={counts} />
          </div>
          <div className="lg:col-span-12">
            <ThreatMap events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
