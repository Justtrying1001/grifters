"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchResult {
  id: string;
  slug: string;
  name?: string;
  summary?: string;
  type?: string;
  riskLabel?: string;
  date?: string;
}

interface SearchResults {
  people: SearchResult[];
  projects: SearchResult[];
  incidents: SearchResult[];
}

export function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults =
    results &&
    (results.people.length > 0 ||
      results.projects.length > 0 ||
      results.incidents.length > 0);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, projects, incidents..."
          className="w-full pl-10 pr-10 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults(null); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-zinc-500">Searching...</div>
          )}

          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-zinc-500">No results found.</div>
          )}

          {!loading && hasResults && (
            <>
              {results.people.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50">
                    People
                  </div>
                  {results.people.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center gap-2"
                      onClick={() => { router.push(`/people/${p.slug}`); setOpen(false); setQuery(""); }}
                    >
                      <span className="font-medium text-sm text-zinc-900">{p.name}</span>
                      {p.riskLabel && (
                        <span className="text-xs text-zinc-500">· {p.riskLabel}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {results.projects.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50">
                    Projects
                  </div>
                  {results.projects.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-50"
                      onClick={() => { router.push(`/projects/${p.slug}`); setOpen(false); setQuery(""); }}
                    >
                      <span className="font-medium text-sm text-zinc-900">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.incidents.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50">
                    Incidents
                  </div>
                  {results.incidents.map((i) => (
                    <button
                      key={i.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-50"
                      onClick={() => { router.push(`/incidents/${i.slug}`); setOpen(false); setQuery(""); }}
                    >
                      <span className="text-sm text-zinc-900 line-clamp-1">{i.summary}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
