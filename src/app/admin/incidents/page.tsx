"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";

interface Incident {
  id: string;
  slug: string;
  type: string;
  date: string;
  summary: string;
  status: string;
  createdAt: string;
  sources: Array<{ id: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  SCAM: "Scam", RUG_PULL: "Rug Pull", PUMP_AND_DUMP: "Pump & Dump",
  MISLEADING_PROMOTION: "Misleading Promotion", INSIDER_DUMP: "Insider Dump",
  EXIT_SCAM: "Exit Scam", OTHER: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800",
};

export default function AdminIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    const url = filter === "all" ? "/api/admin/incidents" : `/api/admin/incidents?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setIncidents(data.incidents ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { setLoading(true); fetchIncidents(); }, [fetchIncidents]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this incident? This cannot be undone.")) return;
    setDeletingId(id);
    await fetch(`/api/admin/incidents/${id}`, { method: "DELETE" });
    await fetchIncidents();
    setDeletingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Incidents</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {["all", "PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-sm px-3 py-1.5 rounded ${filter === s ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"}`}
          >
            {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading && <p className="text-zinc-400">Loading...</p>}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {!loading && incidents.length === 0 && (
          <div className="py-8 text-center text-zinc-400 text-sm">No incidents found.</div>
        )}
        {incidents.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Summary</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Sources</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-600 text-xs">{TYPE_LABELS[incident.type] ?? incident.type}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    {new Date(incident.date).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 max-w-xs truncate">{incident.summary}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[incident.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {incident.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{incident.sources.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/incidents/${incident.slug}`} target="_blank" className="text-zinc-400 hover:text-zinc-900">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(incident.id)}
                        disabled={deletingId === incident.id}
                        className="text-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
