"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";

interface Dispute {
  id: string;
  targetUrl: string;
  reason: string;
  evidenceUrls: string[];
  submitterEmail?: string;
  status: string;
  resolvedNote?: string;
  createdAt: string;
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resolvedNote, setResolvedNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");

  const fetchDisputes = useCallback(async () => {
    const res = await fetch(`/api/admin/disputes?status=${filter}`);
    const data = await res.json();
    setDisputes(data.disputes ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { setLoading(true); fetchDisputes(); }, [fetchDisputes]);

  async function handleAction(id: string, status: string, note?: string) {
    setActionLoading(id);
    await fetch(`/api/admin/disputes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolvedNote: note }),
    });
    await fetchDisputes();
    setActionLoading(null);
    setShowNoteInput(null);
    setResolvedNote("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Disputes</h1>

      <div className="flex gap-2 mb-6">
        {["PENDING", "RESOLVED", "DISMISSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-sm px-4 py-2 rounded ${filter === s ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"}`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && <p className="text-zinc-400">Loading...</p>}

      {!loading && disputes.length === 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
          <p className="text-zinc-400">No {filter.toLowerCase()} disputes.</p>
        </div>
      )}

      <div className="space-y-4">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="bg-white rounded-lg border border-zinc-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <a
                  href={dispute.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-900 hover:underline flex items-center gap-1 mb-2"
                >
                  {dispute.targetUrl}
                  <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
                </a>

                <p className="text-sm text-zinc-600 mb-3 leading-relaxed">{dispute.reason}</p>

                {dispute.evidenceUrls.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-zinc-400 mb-1">Evidence URLs:</p>
                    <ul className="space-y-1">
                      {dispute.evidenceUrls.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:underline flex items-center gap-1">
                            {url}
                            <ExternalLink className="h-3 w-3 text-zinc-400" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-zinc-400">
                  {dispute.submitterEmail && <span>From: {dispute.submitterEmail} · </span>}
                  Submitted: {new Date(dispute.createdAt).toLocaleString()}
                </div>

                {dispute.resolvedNote && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 text-sm text-zinc-600">
                    Resolution note: {dispute.resolvedNote}
                  </div>
                )}
              </div>

              {filter === "PENDING" && (
                <div className="flex flex-col gap-2 shrink-0">
                  {showNoteInput === dispute.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={resolvedNote}
                        onChange={(e) => setResolvedNote(e.target.value)}
                        placeholder="Resolution note (optional)"
                        className="text-xs border border-zinc-300 rounded px-2 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(dispute.id, "RESOLVED", resolvedNote)}
                          className="flex-1 text-xs bg-green-600 text-white px-2 py-1.5 rounded hover:bg-green-700"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => { setShowNoteInput(null); setResolvedNote(""); }}
                          className="text-xs text-zinc-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        disabled={actionLoading === dispute.id}
                        onClick={() => setShowNoteInput(dispute.id)}
                        className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Resolve
                      </button>
                      <button
                        disabled={actionLoading === dispute.id}
                        onClick={() => handleAction(dispute.id, "DISMISSED")}
                        className="flex items-center gap-1 text-xs bg-zinc-500 text-white px-3 py-1.5 rounded hover:bg-zinc-600 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
