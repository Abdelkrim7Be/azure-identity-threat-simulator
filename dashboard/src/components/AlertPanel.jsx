import { useMemo, useState } from "react";

function sevText(sev) {
  if (sev === "critical") return "text-red-300";
  if (sev === "warning") return "text-amber-300";
  return "text-sky-300";
}

function filterButton(active) {
  return active
    ? "filter-chip-active"
    : "filter-chip-idle";
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
    <section className="flex h-full flex-col rounded-md border border-slate-800 bg-[#0b1220]/92">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-[16px] font-normal text-slate-50">
            Alerts
          </h2>
          <div className="mt-0.5 text-[14px] text-slate-400">
            Recent simulator events by severity.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <button
            onClick={() => setFilter("all")}
            className={`filter-chip font-normal ${filterButton(filter === "all")}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`filter-chip font-normal ${filterButton(filter === "critical")}`}
          >
            Critical ({counts?.critical ?? 0})
          </button>
          <button
            onClick={() => setFilter("warning")}
            className={`filter-chip font-normal ${filterButton(filter === "warning")}`}
          >
            Warning ({counts?.warning ?? 0})
          </button>
          <button
            onClick={() => setFilter("info")}
            className={`filter-chip font-normal ${filterButton(filter === "info")}`}
          >
            Info ({counts?.info ?? 0})
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="hidden grid-cols-[minmax(0,1fr)_92px] border-b border-slate-800 bg-slate-950/50 px-4 py-2 text-[14px] font-normal text-slate-500 lg:grid">
          <div>Alert</div>
          <div className="text-right">Time</div>
        </div>
        {items.length === 0 ? (
          <div className="grid grid-cols-1 gap-2 border-b border-slate-800 px-4 py-4 text-[14px] text-slate-400 lg:grid-cols-[minmax(0,1fr)_92px]">
            <div>
              <div className="text-slate-100">No matching alerts</div>
              <div className="mt-1 text-[14px] text-slate-500">
                The selected queue is clear.
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-[14px] text-slate-500">
                <div className="rounded-md border border-slate-800 bg-slate-950/35 px-2 py-2">
                  Critical: {counts?.critical ?? 0}
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-950/35 px-2 py-2">
                  Warning: {counts?.warning ?? 0}
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-950/35 px-2 py-2">
                  Info: {counts?.info ?? 0}
                </div>
              </div>
            </div>
            <div className="text-[14px] text-slate-500 lg:text-right">--</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {items.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-1 gap-2 bg-[#0b1220] px-4 py-2.5 hover:bg-slate-900/70 lg:grid-cols-[minmax(0,1fr)_92px]"
              >
                <div className="min-w-0">
                  <div
                    className={`text-[14px] font-normal ${sevText(e.severity)}`}
                  >
                    {String(e.severity)} · {e.result}
                  </div>
                  <div className="mt-1 truncate text-[14px] font-normal text-slate-100">
                    {e.step}
                  </div>
                  <div className="mt-1 break-words text-[13px] leading-5 text-slate-400">
                    {e.target}
                  </div>
                  <div className="mt-1 text-[14px] leading-5 text-slate-400">
                    <span className="font-normal text-slate-500">MITRE:</span> {e.mitre_tactic}{" "}
                    · {e.mitre_technique}
                  </div>
                </div>
                <div className="text-[14px] text-slate-500 lg:text-right">
                  {new Date(e.ts).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
