import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MITRE_ORDER = [
  "Initial Access",
  "Credential Access",
  "Discovery",
  "Collection",
  "Exfiltration",
  "Impact",
  "Execution",
];

function tacticAccent(tactic) {
  if (tactic === "Credential Access") return "#ff1744";
  if (tactic === "Exfiltration") return "#ff1744";
  if (tactic === "Discovery") return "#39ff14";
  return "#a1a1aa";
}

export default function ThreatMap({ events }) {
  const data = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    const byTactic = new Map();
    for (const e of list) {
      const k = e.mitre_tactic || "Unknown";
      byTactic.set(k, (byTactic.get(k) || 0) + 1);
    }

    const rows = Array.from(byTactic.entries()).map(([tactic, count]) => ({
      tactic,
      count,
      color: tacticAccent(tactic),
    }));

    rows.sort((a, b) => {
      const ia = MITRE_ORDER.indexOf(a.tactic);
      const ib = MITRE_ORDER.indexOf(b.tactic);
      if (ia === -1 && ib === -1) return a.tactic.localeCompare(b.tactic);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return rows;
  }, [events]);

  const techniqueList = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    const seen = new Set();
    for (const e of list) {
      const key = `${e.mitre_tactic}::${e.mitre_technique}`;
      seen.add(key);
    }
    return Array.from(seen)
      .map((x) => {
        const [tactic, technique] = x.split("::");
        return { tactic, technique };
      })
      .slice(0, 18);
  }, [events]);

  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">
            MITRE ATT&amp;CK Threat Map
          </h2>
          <div className="mt-1 text-xs text-slate-400">
            Répartition des événements par tactique (approximation démo).
          </div>
        </div>
        <div className="text-xs text-slate-300">
          Techniques vues:{" "}
          <span className="text-slate-100">{techniqueList.length}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="h-[280px] rounded-xl border border-white/10 bg-white/5 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="tactic"
                  tick={{ fill: "rgba(226,232,240,0.75)", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "rgba(226,232,240,0.75)", fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(11,18,32,0.9)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: "rgba(226,232,240,0.9)" }}
                  itemStyle={{ color: "rgba(226,232,240,0.9)" }}
                />
                <Bar dataKey="count" fill="#39ff14" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs font-semibold tracking-wide text-slate-200">
              Techniques (échantillon)
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {techniqueList.length === 0 ? (
                <div className="text-sm text-slate-300">
                  Aucune technique pour l’instant.
                </div>
              ) : (
                techniqueList.map((t) => (
                  <div
                    key={`${t.tactic}-${t.technique}`}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div className="text-[11px] text-slate-400">{t.tactic}</div>
                    <div className="text-sm font-medium text-slate-100">
                      {t.technique}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
