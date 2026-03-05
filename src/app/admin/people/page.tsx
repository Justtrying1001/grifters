"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, Plus } from "lucide-react";

interface Person {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  roles: string[];
  riskLabel: string;
  riskScore: number;
}

const RISK_STYLES: Record<string, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default function AdminPeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchPeople = useCallback(async () => {
    const res = await fetch("/api/people?limit=100");
    const data = await res.json();
    setPeople(data.people ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPeople(); }, [fetchPeople]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this person? This cannot be undone.")) return;
    setDeletingId(id);
    await fetch(`/api/admin/people/${id}`, { method: "DELETE" });
    await fetchPeople();
    setDeletingId(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    setShowCreate(false);
    setCreating(false);
    await fetchPeople();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">People</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2 rounded text-sm hover:bg-zinc-700"
        >
          <Plus className="h-4 w-4" />
          Add Person
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-zinc-200 rounded-lg p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Full name"
              className="w-full border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <button type="submit" disabled={creating} className="bg-zinc-900 text-white px-4 py-2 rounded text-sm hover:bg-zinc-700 disabled:opacity-50">
            {creating ? "Creating..." : "Create"}
          </button>
          <button type="button" onClick={() => setShowCreate(false)} className="border border-zinc-300 px-4 py-2 rounded text-sm hover:bg-zinc-50">
            Cancel
          </button>
        </form>
      )}

      {loading && <p className="text-zinc-400">Loading...</p>}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {!loading && people.length === 0 && (
          <div className="py-8 text-center text-zinc-400 text-sm">No people found.</div>
        )}
        {people.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Aliases</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Roles</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Risk</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {people.map((person) => (
                <tr key={person.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{person.name}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{person.aliases.slice(0, 2).join(", ")}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{person.roles.slice(0, 2).join(", ")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_STYLES[person.riskLabel] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {person.riskLabel} ({Math.round(person.riskScore)})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/people/${person.slug}`} target="_blank" className="text-zinc-400 hover:text-zinc-900">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(person.id)}
                        disabled={deletingId === person.id}
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
