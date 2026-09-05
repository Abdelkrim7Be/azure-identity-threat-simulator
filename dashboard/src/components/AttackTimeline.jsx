import { useEffect, useMemo, useRef, useState } from "react";

function resultDot(result) {
  if (result === "success") return "bg-emerald-400";
  if (result === "blocked") return "bg-red-400";
  if (result === "failed") return "bg-amber-400";
  if (result === "stopped") return "bg-slate-400";
  return "bg-slate-500";
}

function serviceName(event) {
  const target = String(event.target || "").toLowerCase();
  const step = String(event.step || "").toLowerCase();
  if (target.includes("vault.azure.net") || step.includes("key vault"))
    return "Key Vault";
  if (target.includes("blob.core.windows.net") || step.includes("storage"))
    return "Storage";
  if (target.includes("resourcegroup") || step.includes("arm"))
    return "ARM";
  if (target === "azure") return "Azure";
  return "Local";
}

const PHASE_META = {
  "Initial Access": {
    phase: "Phase 1",
  },
  "Credential Access": {
    phase: "Phase 2",
  },
  Discovery: {
    phase: "Phase 3",
  },
  Collection: {
    phase: "Phase 4",
  },
  Exfiltration: {
    phase: "Phase 5",
  },
  Impact: {
    phase: "Phase 6",
  },
  Execution: {
    phase: "Phase 7",
  },
  Unknown: {
    phase: "Phase ?",
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
    <section className="flex h-full flex-col rounded-md border border-slate-800 bg-[#0b1220]/92">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-[16px] font-normal text-slate-50">
            Attack timeline
          </h2>
          <div className="mt-0.5 text-[14px] text-slate-400">
            Local simulator events grouped by MITRE phase.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[13px] text-slate-400">
            {items.length} event(s)
          </div>
          <button
            type="button"
            onClick={onClearTimeline}
            className="btn btn-secondary h-8 px-2 text-[13px]"
          >
            Clear Timeline
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="hidden grid-cols-[minmax(0,1fr)_120px] border-b border-slate-800 bg-slate-950/50 px-4 py-2 text-[14px] font-normal text-slate-500 lg:grid">
          <div>Event</div>
          <div className="text-right">Result</div>
        </div>
        {items.length === 0 ? (
          <div className="border-b border-slate-800 px-4 py-4 text-[14px] text-slate-400">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_120px]">
              <div>
                <div className="text-slate-100">No events captured</div>
                <div className="mt-1 text-[14px] text-slate-500">
                  Awaiting simulator telemetry from the local API.
                </div>
              </div>
              <div className="text-[14px] text-slate-500 lg:text-right">standby</div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-2 text-[14px] text-slate-500 sm:grid-cols-2 xl:grid-cols-3">
              {ORDER.filter((phase) => phase !== "Unknown").map((phase) => (
                <div
                  key={phase}
                  className="rounded-md border border-slate-800 bg-slate-950/35 px-3 py-2"
                >
                  {PHASE_META[phase]?.phase} · {phase}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {grouped.map(([tactic, tacticEvents]) => {
              const meta = PHASE_META[tactic] || PHASE_META.Unknown;
              const isCollapsed = Boolean(collapsed[tactic]);
              return (
                <div key={tactic}>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [tactic]: !prev[tactic],
                      }))
                    }
                    className="group flex w-full items-center justify-between gap-3 bg-slate-950/45 px-4 py-2 text-left transition-colors hover:bg-slate-900"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="w-14 text-[13px] font-normal text-slate-500">
                        {meta.phase}
                      </span>
                      <span className="text-[14px] font-normal text-slate-100">
                        {tactic}
                      </span>
                      <span className="text-[13px] text-slate-500">
                        {tacticEvents.length} event(s)
                      </span>
                    </div>
                    <span className="shrink-0 text-[13px] font-normal text-slate-500 group-hover:text-slate-300">
                      {isCollapsed ? "Expand" : "Collapse"}
                    </span>
                  </button>

                  {!isCollapsed ? (
                    <ol className="bg-[#0b1220]">
                      {tacticEvents.map((e) => (
                        <li
                          key={e.id}
                          className="grid grid-cols-1 gap-2 border-t border-slate-800/70 px-4 py-3 hover:bg-slate-900/70 lg:grid-cols-[minmax(0,1fr)_120px]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${resultDot(e.result)}`}
                              />
                              <span className="text-[14px] text-sky-300/80">
                                {serviceName(e)}
                              </span>
                              <div className="truncate text-[14px] font-normal text-slate-100">
                                {e.step}
                              </div>
                            </div>
                            {e.details ? (
                              <div className="mt-1 break-words text-[14px] leading-5 text-slate-400">
                                {e.details}
                              </div>
                            ) : null}
                            <div className="mt-1 break-words text-[14px] leading-5 text-slate-400">
                              <span className="font-normal text-slate-500">Target:</span>{" "}
                              {e.target}
                            </div>
                            <div className="break-words text-[14px] leading-5 text-slate-400">
                              <span className="font-normal text-slate-500">MITRE:</span>{" "}
                              {e.mitre_technique}
                            </div>
                          </div>
                          <div className="flex items-start justify-between gap-3 text-[14px] text-slate-400 lg:block lg:text-right">
                            <div className="font-normal">
                              {e.result}
                            </div>
                            <div className="text-[14px] text-slate-500">
                              {new Date(e.ts).toLocaleTimeString()}
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
