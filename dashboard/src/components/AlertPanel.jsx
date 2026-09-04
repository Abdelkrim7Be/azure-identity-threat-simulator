import { useMemo, useState } from "react";

function sevStyle(sev) {
  if (sev === "critical") return "border-neon-red/35 bg-neon-red/10";
  if (sev === "warning") return "border-amber-300/35 bg-amber-300/10";
  return "border-white/10 bg-white/5";
}

function sevText(sev) {
  if (sev === "critical") return "text-neon-red";
  if (sev === "warning") return "text-amber-200";
  return "text-slate-200";
}

export default function AlertPanel({ events, counts }) {
  const [filter, setFilter] = useState("all");

  const items = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    if (filter === "all") return list.slice().reverse().slice(0, 12);
    return list
      .filter((e) => e.severity === filter)
      .slice()
      .reverse()
      .slice(0, 12);
  }, [events, filter]);

  return (
    <section className="glass flex h-full flex-col rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">
          Alerts
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md border px-2 py-1 ${
              filter === "all"
                ? "border-neon-green/30 bg-neon-green/10 text-neon-green"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`rounded-md border px-2 py-1 ${
              filter === "critical"
                ? "border-neon-red/35 bg-neon-red/10 text-neon-red"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            Critical ({counts?.critical ?? 0})
          </button>
          <button
            onClick={() => setFilter("warning")}
            className={`rounded-md border px-2 py-1 ${
              filter === "warning"
                ? "border-amber-300/35 bg-amber-300/10 text-amber-200"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            Warning ({counts?.warning ?? 0})
          </button>
          <button
            onClick={() => setFilter("info")}
            className={`rounded-md border px-2 py-1 ${
              filter === "info"
                ? "border-white/15 bg-white/10 text-slate-100"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            Info ({counts?.info ?? 0})
          </button>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No events match this filter.
          </div>
        ) : (
          items.map((e) => (
            <div
              key={e.id}
              className={`rounded-xl border p-3 ${sevStyle(e.severity)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={`text-xs font-semibold ${sevText(e.severity)}`}
                  >
                    {String(e.severity).toUpperCase()} · {e.result}
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-slate-100">
                    {e.step}
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-300">
                    {e.target}
                  </div>
                </div>
                <div className="shrink-0 text-[11px] text-slate-200">
                  {new Date(e.ts).toLocaleTimeString()}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-300">
                <span className="text-slate-400">MITRE:</span> {e.mitre_tactic}{" "}
                · {e.mitre_technique}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
