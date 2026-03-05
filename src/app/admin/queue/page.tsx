"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, MessageSquare, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface Source {
  id: string;
  url: string;
  title: string;
  excerpt?: string;
  archiveUrl?: string;
}

interface Person {
  slug: string;
  name: string;
}

interface Project {
  slug: string;
  name: string;
}

interface Incident {
  id: string;
  slug: string;
  type: string;
  date: string;
  summary: string;
  narrative: string;
  status: string;
  submitterEmail?: string;
  createdAt: string;
  sources: Source[];
  people: Array<{ person: Person }>;
  projects: Array<{ project: Project }>;
}

const TYPE_LABELS: Record<string, string> = {
  SCAM: "Scam", RUG_PULL: "Rug Pull", PUMP_AND_DUMP: "Pump & Dump",
  MISLEADING_PROMOTION: "Misleading Promotion", INSIDER_DUMP: "Insider Dump",
  EXIT_SCAM: "Exit Scam", OTHER: "Other",
};

export default function AdminQueue() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    const res = await fetch("/api/admin/incidents?status=PENDING");
    const data = await res.json();
    setIncidents(data.incidents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  async function handleAction(id: string, status: string, reason?: string) {
    setActionLoading(id);
    await fetch(`/api/admin/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason: reason }),
    });
    await fetchQueue();
    setActionLoading(null);
    setShowRejectInput(null);
    setRejectionReason("");
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-6">Review Queue</h1>
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Review Queue</h1>
      <p className="text-zinc-500 text-sm mb-6">{incidents.length} pending submission{incidents.length !== 1 ? "s" : ""}</p>

      {incidents.length === 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
          <p className="text-zinc-500">Queue is empty. All submissions reviewed.</p>
        </div>
      )}

      <div className="space-y-4">
        {incidents.map((incident) => (
          <div key={incident.id} className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium">
                      {TYPE_LABELS[incident.type] ?? incident.type}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(incident.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <span className="text-xs text-zinc-400">· {incident.sources.length} sources</span>
                  </div>
                  <p className="font-medium text-zinc-900 text-sm">{incident.summary}</p>
                  {incident.submitterEmail && (
                    <p className="text-xs text-zinc-400 mt-1">Submitted by: {incident.submitterEmail}</p>
                  )}
                  <p className="text-xs text-zinc-400">
                    Submitted: {new Date(incident.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === incident.id ? null : incident.id)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-2.5 py-1.5 rounded"
                  >
                    Details
                    {expandedId === incident.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <button
                    disabled={actionLoading === incident.id}
                    onClick={() => handleAction(incident.id, "APPROVED")}
                    className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    disabled={actionLoading === incident.id}
                    onClick={() => handleAction(incident.id, "CHANGES_REQUESTED")}
                    className="flex items-center gap-1 text-xs bg-orange-500 text-white px-3 py-1.5 rounded hover:bg-orange-600 disabled:opacity-50"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Changes
                  </button>
                  {showRejectInput === incident.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="text-xs border border-zinc-300 rounded px-2 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                      <button
                        onClick={() => handleAction(incident.id, "REJECTED", rejectionReason)}
                        className="text-xs bg-red-600 text-white px-2 py-1.5 rounded hover:bg-red-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setShowRejectInput(null); setRejectionReason(""); }}
                        className="text-xs text-zinc-500 hover:text-zinc-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={actionLoading === incident.id}
                      onClick={() => setShowRejectInput(incident.id)}
                      className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded detail */}
            {expandedId === incident.id && (
              <div className="border-t border-zinc-100 p-5 bg-zinc-50 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Narrative</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{incident.narrative}</p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Sources</h3>
                  <div className="space-y-2">
                    {incident.sources.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-zinc-700 hover:underline flex items-center gap-1">
                          {s.title || s.url}
                          <ExternalLink className="h-3 w-3 text-zinc-400" />
                        </a>
                        {s.archiveUrl && <span className="text-xs text-green-600">· archived</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {(incident.people.length > 0 || incident.projects.length > 0) && (
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Linked Entities</h3>
                    <div className="flex flex-wrap gap-2">
                      {incident.people.map(({ person }) => (
                        <a key={person.slug} href={`/people/${person.slug}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-white border border-zinc-200 px-2 py-1 rounded hover:bg-zinc-50">
                          {person.name}
                        </a>
                      ))}
                      {incident.projects.map(({ project }) => (
                        <a key={project.slug} href={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-white border border-zinc-200 px-2 py-1 rounded hover:bg-zinc-50">
                          {project.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
