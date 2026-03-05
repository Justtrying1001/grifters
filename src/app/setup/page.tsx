"use client";

import { useState } from "react";
import { Suspense } from "react";

function SetupContent() {
  const [setupSecret, setSetupSecret] = useState("");

  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [adminIdentifier, setAdminIdentifier] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<"reset" | "admin" | null>(null);

  async function handleReset() {
    if (!confirm("Vider toutes les données ? (hors users)")) return;
    setLoading("reset");
    const res = await fetch("/api/admin/db-reset", { method: "POST", headers: { "x-setup-secret": setupSecret, Authorization: `Bearer ${setupSecret}` } });
    const data = await res.json();
    setResetStatus(res.ok ? "DB vidée avec succès." : `Erreur : ${data.error}`);
    setLoading(null);
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setLoading("admin");
    const res = await fetch("/api/setup/create-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-setup-secret": setupSecret, Authorization: `Bearer ${setupSecret}` },
      body: JSON.stringify({ identifier: adminIdentifier, password: adminPassword }),
    });
    const data = await res.json();
    setAdminStatus(res.ok ? `Admin créé : ${adminIdentifier}` : `Erreur : ${data.error}`);
    setLoading(null);
  }

  return (
    <div className="space-y-8">
      <section className="bg-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-2 text-amber-400">Accès Setup sécurisé</h2>
        <p className="text-sm text-zinc-400 mb-4">Le secret setup est requis et transmis uniquement en header (jamais dans l’URL). En production, active explicitement <code>ENABLE_SETUP=true</code>.</p>
        <input
          type="password"
          value={setupSecret}
          onChange={e => setSetupSecret(e.target.value)}
          required
          placeholder="SETUP_SECRET"
          className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </section>

      {/* Reset */}
      <section className="bg-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-2 text-red-400">Reset DB</h2>
        <p className="text-sm text-zinc-400 mb-4">Supprime toutes les données (incidents, personnes, projets…). Le compte admin est préservé.</p>
        {resetStatus && <p className="text-sm mb-3 text-green-400">{resetStatus}</p>}
        <button
          onClick={handleReset}
          disabled={loading === "reset"}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium"
        >
          {loading === "reset" ? "En cours…" : "Vider la DB"}
        </button>
      </section>

      {/* Create admin */}
      <section className="bg-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-2 text-blue-400">Créer / réinitialiser un admin</h2>
        <p className="text-sm text-zinc-400 mb-4">Crée un compte admin (identifiant + mot de passe) ou met à jour son mot de passe.</p>
        {adminStatus && <p className="text-sm mb-3 text-green-400">{adminStatus}</p>}
        <form onSubmit={handleCreateAdmin} className="space-y-3">
          <input
            type="text"
            value={adminIdentifier}
            onChange={e => setAdminIdentifier(e.target.value)}
            required
            placeholder="identifiant-admin"
            className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Mot de passe (min 8 caractères)"
            className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading === "admin"}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium"
          >
            {loading === "admin" ? "En cours…" : "Créer l'admin"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">Setup</h1>
        <Suspense fallback={<p className="text-zinc-400">Chargement…</p>}>
          <SetupContent />
        </Suspense>
      </div>
    </div>
  );
}
