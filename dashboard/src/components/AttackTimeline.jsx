import { useEffect, useMemo, useRef, useState } from "react";

function resultDot(result) {
  if (result === "success")
    return "bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.55)]";
  if (result === "blocked")
    return "bg-neon-red shadow-[0_0_10px_rgba(255,23,68,0.55)]";
  if (result === "failed")
    return "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.45)]";
  return "bg-slate-500";
}

const PHASE_META = {
  "Initial Access": {
    phase: "Phase 1",
    color: "border-sky-400/45 bg-sky-400/10 text-sky-300",
  },
  "Credential Access": {
    phase: "Phase 2",
    color: "border-neon-red/45 bg-neon-red/10 text-neon-red",
  },
  Discovery: {
    phase: "Phase 3",
    color: "border-violet-400/45 bg-violet-400/10 text-violet-300",
  },
  Collection: {
    phase: "Phase 4",
    color: "border-fuchsia-400/45 bg-fuchsia-400/10 text-fuchsia-300",
  },
  Exfiltration: {
    phase: "Phase 5",
    color: "border-amber-300/45 bg-amber-300/10 text-amber-200",
  },
  Impact: {
    phase: "Phase 6",
    color: "border-emerald-400/45 bg-emerald-400/10 text-emerald-300",
  },
  Execution: {
    phase: "Phase 7",
    color: "border-cyan-400/45 bg-cyan-400/10 text-cyan-300",
  },
  Unknown: {
    phase: "Phase ?",
    color: "border-white/20 bg-white/5 text-slate-300",
  },
};

const ORDER = [
  "Initial Access",
  "Credential Access",
  "Discovery",
  "Collection",
  "Exfiltration",
  "Impact",
  "Execution",
  "Unknown",
];

export default function AttackTimeline({ events, onClearTimeline }) {
  const bottomRef = useRef(null);
  const items = useMemo(() => (Array.isArray(events) ? events : []), [events]);
  const [collapsed, setCollapsed] = useState({});

  const grouped = useMemo(() => {
    const map = new Map();
    for (const e of items) {
      const key = e.mitre_tactic || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return Array.from(map.entries()).sort(
      (a, b) =>
        (ORDER.indexOf(a[0]) === -1 ? 999 : ORDER.indexOf(a[0])) -
        (ORDER.indexOf(b[0]) === -1 ? 999 : ORDER.indexOf(b[0])),
    );
  }, [items]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  return (
    <section className="glass flex h-full flex-col rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">
          Timeline by MITRE Phases
        </h2>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400">
            {items.length} event(s)
          </div>
          <button
            type="button"
            onClick={onClearTimeline}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
          >
            Clear Timeline
          </button>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No events yet. Click{" "}
            <span className="text-neon-green">Start Attack</span>.
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(([tactic, tacticEvents]) => {
              const meta = PHASE_META[tactic] || PHASE_META.Unknown;
              const isCollapsed = Boolean(collapsed[tactic]);
              return (
                <div
                  key={tactic}
                  className="rounded-xl border border-white/10 bg-white/5 p-2"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [tactic]: !prev[tactic],
                      }))
                    }
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] ${meta.color}`}
                      >
                        {meta.phase}
                      </span>
                      <span className="text-sm font-semibold text-slate-100">
                        {tactic}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({tacticEvents.length})
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {isCollapsed ? "Expand" : "Collapse"}
                    </span>
                  </button>

                  {!isCollapsed ? (
                    <ol className="space-y-2 p-2">
                      {tacticEvents.map((e) => (
                        <li
                          key={e.id}
                          className="rounded-xl border border-white/10 bg-white/5 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${resultDot(e.result)}`}
                                />
                                <div className="truncate text-sm font-medium text-slate-100">
                                  {e.step}
                                </div>
                              </div>
                              <div className="mt-1 truncate text-xs text-slate-400">
                                <span className="text-slate-300">Target:</span>{" "}
                                {e.target}
                              </div>
                              <div className="mt-2 text-xs text-slate-300">
                                <span className="text-slate-400">MITRE:</span>{" "}
                                {e.mitre_tactic} · {e.mitre_technique}
                              </div>
                              {e.details ? (
                                <div className="mt-2 text-xs text-slate-400 break-words">
                                  {e.details}
                                </div>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-xs font-medium text-slate-200">
                                {e.result}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-400">
                                {new Date(e.ts).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
