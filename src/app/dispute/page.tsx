"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Plus, Trash2 } from "lucide-react";

function DisputeForm() {
  const searchParams = useSearchParams();
  const defaultTarget = searchParams.get("target") ?? "";

  const [targetUrl, setTargetUrl] = useState(defaultTarget);
  const [reason, setReason] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([""]);
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function addEvidence() {
    setEvidenceUrls([...evidenceUrls, ""]);
  }

  function removeEvidence(i: number) {
    setEvidenceUrls(evidenceUrls.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          reason,
          evidenceUrls: evidenceUrls.filter((u) => u.trim()),
          submitterEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Submission failed.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Dispute Received</h1>
        <p className="text-zinc-500 mb-6">
          We aim to review disputes within 7 days. If you provided contact information, we may
          reach out for additional details.
        </p>
        <a href="/" className="text-sm text-zinc-600 underline hover:text-zinc-900">
          Return to home
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Dispute / Correction Request</h1>
        <p className="text-zinc-500 text-sm">
          If you believe an entry is inaccurate, contains incorrect information, or violates our
          editorial policy, you can submit a dispute here. We aim to review all disputes within{" "}
          <strong>7 days</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Link to contested entry <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            required
            placeholder="https://grifter.io/people/..."
            className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-400 mt-1">The full URL of the profile, incident, or project page you are disputing.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Reason for dispute <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={6}
            placeholder="Describe specifically what information is incorrect, why it is incorrect, and what the correct information is. Be as specific as possible."
            className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Supporting evidence (optional)
          </label>
          <div className="space-y-2">
            {evidenceUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const updated = [...evidenceUrls];
                    updated[i] = e.target.value;
                    setEvidenceUrls(updated);
                  }}
                  placeholder="https://..."
                  className="flex-1 border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                {evidenceUrls.length > 1 && (
                  <button type="button" onClick={() => removeEvidence(i)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addEvidence}
            className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 mt-2"
          >
            <Plus className="h-4 w-4" />
            Add another URL
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Contact email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-400 mt-1">Required so we can notify you of the outcome.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-zinc-900 text-white py-3 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit Dispute"}
        </button>
      </form>
    </div>
  );
}

export default function DisputePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-10">Loading...</div>}>
      <DisputeForm />
    </Suspense>
  );
}
