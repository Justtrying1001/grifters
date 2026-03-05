import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="font-bold text-zinc-900">GRIFTER</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
              Grifter is an evidence-based documentation database. All information is sourced and
              presented neutrally. Nothing on this site constitutes legal judgment or proof of
              wrongdoing.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide mb-3">
              Database
            </h3>
            <ul className="space-y-2">
              <li><Link href="/people" className="text-sm text-zinc-600 hover:text-zinc-900">People</Link></li>
              <li><Link href="/projects" className="text-sm text-zinc-600 hover:text-zinc-900">Projects</Link></li>
              <li><Link href="/incidents" className="text-sm text-zinc-600 hover:text-zinc-900">Incidents</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide mb-3">
              Info
            </h3>
            <ul className="space-y-2">
              <li><Link href="/methodology" className="text-sm text-zinc-600 hover:text-zinc-900">Methodology</Link></li>
              <li><Link href="/about" className="text-sm text-zinc-600 hover:text-zinc-900">About</Link></li>
              <li><Link href="/dispute" className="text-sm text-zinc-600 hover:text-zinc-900">Dispute an Entry</Link></li>
              <li><Link href="/submit" className="text-sm text-zinc-600 hover:text-zinc-900">Submit an Incident</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200">
          <p className="text-xs text-zinc-400">
            All incidents are alleged or reported unless stated otherwise. Individuals and entities
            may{" "}
            <Link href="/dispute" className="underline hover:text-zinc-600">
              submit a response or dispute any entry
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
