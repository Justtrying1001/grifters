import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">About Grifter</h1>
      <p className="text-zinc-500 mb-10">Our mission, principles, and legal disclaimers.</p>

      <div className="prose prose-zinc max-w-none space-y-10">

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Mission</h2>
          <p className="text-zinc-600 leading-relaxed">
            Grifter exists to provide a transparent, evidence-based record of alleged crypto scams,
            rug pulls, pump &amp; dump schemes, and related grift incidents. Our goal is to help
            retail investors, researchers, journalists, and regulators access structured, sourced
            information in a single place.
          </p>
          <p className="text-zinc-600 leading-relaxed mt-3">
            We believe that accountability requires documentation, and documentation requires
            evidence. We do not make accusations — we document what has been reported, with sources.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Principles</h2>
          <ul className="list-disc pl-5 space-y-3 text-zinc-600">
            <li>
              <strong>Evidence-first:</strong> Every claim must have at least one source. Unsourced
              claims are not published.
            </li>
            <li>
              <strong>Neutral language:</strong> We use terms like &quot;alleged&quot;, &quot;reported&quot;, and
              &quot;documented&quot;. We never assert legal guilt.
            </li>
            <li>
              <strong>Right to reply:</strong> Any individual or entity mentioned may submit a
              response. Approved responses are displayed on their profile.
            </li>
            <li>
              <strong>Dispute process:</strong> Anyone can dispute an entry. We aim to review
              disputes within 7 days and correct or remove inaccurate information.
            </li>
            <li>
              <strong>No personal vendetta:</strong> We do not publish entries motivated by personal
              disputes without independent evidence.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Legal Disclaimer</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
            <p className="text-sm text-amber-900 leading-relaxed">
              Grifter is an evidence-based documentation database. All information is sourced and
              presented neutrally. Nothing on this site constitutes legal judgment or proof of
              wrongdoing. All incidents are alleged or reported unless stated otherwise. Individuals
              and entities may{" "}
              <Link href="/dispute" className="underline hover:text-amber-700">
                submit a response or dispute any entry
              </Link>
              .
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Links</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/methodology" className="text-zinc-600 underline hover:text-zinc-900">
                Methodology — How we score and review entries
              </Link>
            </li>
            <li>
              <Link href="/dispute" className="text-zinc-600 underline hover:text-zinc-900">
                Dispute an entry
              </Link>
            </li>
            <li>
              <Link href="/submit" className="text-zinc-600 underline hover:text-zinc-900">
                Submit an incident
              </Link>
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
}
