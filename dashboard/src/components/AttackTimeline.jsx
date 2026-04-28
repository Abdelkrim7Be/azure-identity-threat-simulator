import { useEffect, useMemo, useRef } from "react";

function chip(severity) {
  if (severity === "critical")
    return "border-neon-red/40 bg-neon-red/10 text-neon-red";
  if (severity === "warning")
    return "border-amber-300/40 bg-amber-300/10 text-amber-200";
  return "border-white/10 bg-white/5 text-slate-200";
}

function resultDot(result) {
  if (result === "success")
    return "bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.55)]";
  if (result === "blocked")
    return "bg-neon-red shadow-[0_0_10px_rgba(255,23,68,0.55)]";
  if (result === "failed")
    return "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.45)]";
  return "bg-slate-500";
}

export default function AttackTimeline({ events }) {
  const bottomRef = useRef(null);
  const items = useMemo(() => (Array.isArray(events) ? events : []), [events]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">
          Timeline
        </h2>
        <div className="text-xs text-slate-400">
          {items.length} événement(s)
        </div>
      </div>

      <div className="mt-3 max-h-[520px] overflow-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Aucun événement pour l’instant. Clique sur{" "}
            <span className="text-neon-green">Lancer l’attaque</span>.
          </div>
        ) : (
          <ol className="space-y-3">
            {items.map((e) => (
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
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] ${chip(e.severity)}`}
                      >
                        {String(e.severity).toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-400">
                      <span className="text-slate-300">Target:</span> {e.target}
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
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
