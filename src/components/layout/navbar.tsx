import Link from "next/link";
import { Shield } from "lucide-react";

export function Navbar() {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-zinc-900 text-lg">
            <Shield className="h-5 w-5 text-red-600" />
            GRIFTER
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/people" className="text-sm text-zinc-600 hover:text-zinc-900">
              People
            </Link>
            <Link href="/projects" className="text-sm text-zinc-600 hover:text-zinc-900">
              Projects
            </Link>
            <Link href="/incidents" className="text-sm text-zinc-600 hover:text-zinc-900">
              Incidents
            </Link>
            <Link href="/methodology" className="text-sm text-zinc-600 hover:text-zinc-900">
              Methodology
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/submit"
              className="text-sm bg-zinc-900 text-white px-4 py-2 rounded-md hover:bg-zinc-700 transition-colors"
            >
              Submit Incident
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
