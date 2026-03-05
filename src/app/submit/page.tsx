"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Plus, Trash2 } from "lucide-react";

const INCIDENT_TYPES = [
  { value: "SCAM", label: "Scam" },
  { value: "RUG_PULL", label: "Rug Pull" },
  { value: "PUMP_AND_DUMP", label: "Pump & Dump" },
  { value: "MISLEADING_PROMOTION", label: "Misleading Promotion" },
  { value: "INSIDER_DUMP", label: "Insider Dump" },
  { value: "EXIT_SCAM", label: "Exit Scam" },
  { value: "OTHER", label: "Other" },
];

interface Source {
  url: string;
  title: string;
  excerpt: string;
}

export default function SubmitPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [involvedText, setInvolvedText] = useState("");
  const [summary, setSummary] = useState("");
  const [narrative, setNarrative] = useState("");
  const [sources, setSources] = useState<Source[]>([{ url: "", title: "", excerpt: "" }]);
  const [contactEmail, setContactEmail] = useState("");

  function addSource() {
    setSources([...sources, { url: "", title: "", excerpt: "" }]);
  }

  function removeSource(i: number) {
    setSources(sources.filter((_, idx) => idx !== i));
  }

  function updateSource(i: number, field: keyof Source, value: string) {
    setSources(sources.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const validSources = sources.filter((s) => s.url.trim());
    if (validSources.length === 0) {
      setError("At least one source URL is required.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          date,
          summary,
          narrative,
          sources: validSources,
          contactEmail,
          captchaToken: "dev-bypass",
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
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Submission Received</h1>
        <p className="text-zinc-500 mb-6">
          Thank you for your submission. Our moderation team will review it and may reach out if
          more information is needed. Approved incidents typically appear within 5–7 business days.
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
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Submit an Incident</h1>
        <p className="text-zinc-500 text-sm">
          All submissions are reviewed by our moderation team before publication. Include at least
          one source URL. All claims must be supported by evidence.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                s === step
                  ? "bg-zinc-900 text-white"
                  : s < step
                  ? "bg-green-500 text-white"
                  : "bg-zinc-200 text-zinc-500"
              }`}
            >
              {s}
            </div>
            {s < 5 && <div className={`h-0.5 w-8 ${s < step ? "bg-green-500" : "bg-zinc-200"}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Type + Date */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Step 1: Incident Type & Date</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Incident Type <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
              >
                <option value="">Select type...</option>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Approximate Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!type || !date}
                onClick={() => setStep(2)}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: People/Projects */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Step 2: People & Projects Involved</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                People and/or Projects Involved
              </label>
              <textarea
                value={involvedText}
                onChange={(e) => setInvolvedText(e.target.value)}
                rows={4}
                placeholder="List the names or aliases of individuals and/or project names involved. Include profile URLs if they already exist in the database."
                className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
              <p className="text-xs text-zinc-400 mt-1">Optional but recommended. Our team will link them to existing profiles during review.</p>
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="border border-zinc-300 px-6 py-2.5 rounded-md text-sm hover:bg-zinc-50">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700">
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Summary + Narrative */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Step 3: Summary & Narrative</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Summary <span className="text-red-500">*</span>{" "}
                <span className="text-zinc-400 font-normal">(250 characters max)</span>
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value.slice(0, 250))}
                required
                rows={3}
                placeholder="One or two sentence description of the incident."
                className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
              <p className="text-xs text-zinc-400 mt-1">{summary.length}/250</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Narrative <span className="text-red-500">*</span>{" "}
                <span className="text-zinc-400 font-normal">(2000 characters max)</span>
              </label>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value.slice(0, 2000))}
                required
                rows={8}
                placeholder="Detailed description of the incident. Use neutral, factual language. Describe what happened, when, and what evidence supports it."
                className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
              <p className="text-xs text-zinc-400 mt-1">{narrative.length}/2000</p>
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="border border-zinc-300 px-6 py-2.5 rounded-md text-sm hover:bg-zinc-50">
                Back
              </button>
              <button
                type="button"
                disabled={!summary || !narrative}
                onClick={() => setStep(4)}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Sources */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Step 4: Sources</h2>
            <p className="text-sm text-zinc-500">At least one source URL is required. Archived sources are strongly preferred.</p>

            <div className="space-y-4">
              {sources.map((source, i) => (
                <div key={i} className="border border-zinc-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700">Source {i + 1}</span>
                    {sources.length > 1 && (
                      <button type="button" onClick={() => removeSource(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">URL <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      value={source.url}
                      onChange={(e) => updateSource(i, "url", e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Title</label>
                    <input
                      type="text"
                      value={source.title}
                      onChange={(e) => updateSource(i, "title", e.target.value)}
                      placeholder="Article or page title"
                      className="w-full border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Relevant excerpt (optional)</label>
                    <textarea
                      value={source.excerpt}
                      onChange={(e) => updateSource(i, "excerpt", e.target.value)}
                      rows={2}
                      placeholder="Copy a relevant quote from the source..."
                      className="w-full border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSource}
              className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
            >
              <Plus className="h-4 w-4" />
              Add another source
            </button>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(3)} className="border border-zinc-300 px-6 py-2.5 rounded-md text-sm hover:bg-zinc-50">
                Back
              </button>
              <button
                type="button"
                disabled={!sources.some((s) => s.url.trim())}
                onClick={() => setStep(5)}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review + Submit */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Step 5: Review & Submit</h2>

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-3 text-sm">
              <div><span className="font-medium text-zinc-700">Type:</span> <span className="text-zinc-600">{type}</span></div>
              <div><span className="font-medium text-zinc-700">Date:</span> <span className="text-zinc-600">{date}</span></div>
              <div><span className="font-medium text-zinc-700">Summary:</span> <span className="text-zinc-600">{summary}</span></div>
              <div><span className="font-medium text-zinc-700">Sources:</span> <span className="text-zinc-600">{sources.filter(s => s.url).length} provided</span></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Contact Email (optional)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-zinc-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <p className="text-xs text-zinc-400 mt-1">Only used to follow up if the team needs more information.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
              By submitting, you confirm that this information is accurate to the best of your knowledge
              and is supported by the sources provided. Deliberately false submissions may result in action.
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(4)} className="border border-zinc-300 px-6 py-2.5 rounded-md text-sm hover:bg-zinc-50">
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-zinc-900 text-white px-8 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Incident"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
