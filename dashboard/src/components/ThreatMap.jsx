import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
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
  if (tactic === "Initial Access") return "#38bdf8";
  if (tactic === "Credential Access") return "#f87171";
  if (tactic === "Discovery") return "#818cf8";
  if (tactic === "Collection") return "#22d3ee";
  if (tactic === "Exfiltration") return "#f59e0b";
  if (tactic === "Impact") return "#34d399";
  if (tactic === "Execution") return "#60a5fa";
  return "#94a3b8";
}

export default function ThreatMap({ events }) {
  const seenTechniquesRef = useRef(new Set());
  const [newTechniques, setNewTechniques] = useState(new Set());

  const techniqueDescription = useMemo(
    () => ({
      "T1078 (Valid Accounts)":
        "Abuse of legitimate credentials to access cloud resources.",
      "T1528 (Steal Application Access Token)":
        "Use of stolen or replayed app tokens to authenticate.",
      "T1526 (Cloud Service Discovery)":
        "Enumeration of cloud services and metadata in the tenant.",
      "T1005 (Data from Local System) [cloud analog]":
        "Collection of sensitive data from cloud assets.",
      "T1537 (Transfer Data to Cloud Account)":
        "Transfer of data into attacker-controlled cloud storage.",
      "T1613 (Container and Resource Discovery)":
        "Discovery of containers, blobs, and related cloud resources.",
      "T1020 (Automated Exfiltration)":
        "Automated transfer of data out of the target environment.",
      "T1489 (Service Stop)":
        "Stopping services to degrade operations or visibility.",
      "T1204 (User Execution)":
        "User-initiated activity that completes the simulated sequence.",
    }),
    [],
  );

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

  useEffect(() => {
    const current = new Set(
      techniqueList.map((t) => `${t.tactic}::${t.technique}`),
    );
    const added = new Set();
    for (const key of current) {
      if (!seenTechniquesRef.current.has(key)) added.add(key);
      seenTechniquesRef.current.add(key);
    }
    if (added.size) {
      setNewTechniques(added);
      const timeout = setTimeout(() => setNewTechniques(new Set()), 2500);
      return () => clearTimeout(timeout);
    }
  }, [techniqueList]);

  return (
    <section className="rounded-md border border-slate-800 bg-[#0b1220]/92">
      <div className="flex flex-col gap-1 border-b border-slate-800 px-4 py-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-[16px] font-normal text-slate-50">
            MITRE ATT&amp;CK Threat Map
          </h2>
          <div className="mt-1 text-[13px] text-slate-400">
            Event distribution by tactic.
          </div>
        </div>
        <div className="text-[13px] text-slate-400">
          Techniques seen:{" "}
          <span className="font-normal text-slate-100">{techniqueList.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="h-[420px] bg-[#0b1220] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="tactic"
                  tick={{ fill: "#94a3b8", fontSize: 13 }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 13 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 6,
                  }}
                  labelStyle={{ color: "#f8fafc" }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={`bar-${entry.tactic}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="flex h-[420px] flex-col rounded-md border border-slate-800 bg-[#0b1220]">
            <div className="border-b border-slate-800 px-3 py-2 text-[16px] font-normal text-slate-50">
              Techniques
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {techniqueList.length === 0 ? (
                <div className="p-3 text-[15px] text-slate-400">
                  No techniques yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/70">
                  {techniqueList.map((t) => (
                    <div
                      key={`${t.tactic}-${t.technique}`}
                      title={
                        techniqueDescription[t.technique] ||
                        "Technique observed during the simulation."
                      }
                      className={`px-3 py-2.5 hover:bg-slate-900/70 ${
                        newTechniques.has(`${t.tactic}::${t.technique}`)
                          ? "technique-pulse"
                          : ""
                      }`}
                    >
                      <div className="text-[14px] text-sky-300/80">{t.tactic}</div>
                      <div className="text-[14px] font-normal text-slate-100">
                        {t.technique}
                      </div>
                      <div className="mt-1 text-[14px] leading-5 text-slate-400">
                        {techniqueDescription[t.technique] ||
                          "Technique observed during the simulation."}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
