import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Disclaimer:</strong> Grifter is an evidence-based documentation database. All
          information is sourced and presented neutrally. Nothing on this site constitutes legal
          judgment or proof of wrongdoing. All incidents are alleged or reported unless stated
          otherwise. Individuals and entities may{" "}
          <a href="/dispute" className="underline hover:text-amber-900">
            submit a response or dispute any entry
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export function DisclaimerFooter() {
  return (
    <div className="mt-12 border-t border-zinc-200 pt-6 pb-4">
      <p className="text-xs text-zinc-500 leading-relaxed">
        Grifter is an evidence-based documentation database. All information is sourced and
        presented neutrally. Nothing on this site constitutes legal judgment or proof of wrongdoing.
        All incidents are alleged or reported unless stated otherwise. Individuals and entities may{" "}
        <a href="/dispute" className="underline hover:text-zinc-700">
          submit a response or dispute any entry
        </a>
        .
      </p>
    </div>
  );
}
