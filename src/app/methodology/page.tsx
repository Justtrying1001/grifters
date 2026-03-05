export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">Methodology</h1>
      <p className="text-zinc-500 mb-10">How we collect, review, and score entries in the Grifter database.</p>

      <div className="prose prose-zinc max-w-none space-y-10">

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">How Entries Are Created</h2>
          <p className="text-zinc-600 leading-relaxed">
            Entries in the Grifter database are created through two channels: community submissions
            via the Submit form, and direct entry by the editorial team. All entries go through a
            moderation review before publication.
          </p>
          <p className="text-zinc-600 leading-relaxed mt-3">
            Every incident must be supported by at least one source URL. The editorial team
            independently verifies sources before approving any entry. Unverified or unsupported
            claims are rejected.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Approval Criteria</h2>
          <ul className="list-disc pl-5 space-y-2 text-zinc-600">
            <li>At least one verifiable source URL pointing to reporting, on-chain data, or official records.</li>
            <li>Neutral language: no assertions of legal guilt; use of terms like &quot;alleged&quot;, &quot;reported&quot;, &quot;documented&quot;.</li>
            <li>Incident date must be specified.</li>
            <li>Summary must accurately represent the narrative content.</li>
            <li>No unsubstantiated personal attacks or doxxing of private individuals.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Risk Scoring</h2>
          <p className="text-zinc-600 leading-relaxed mb-4">
            Each person and project in the database receives a risk score from 0–100, computed
            automatically based on their linked approved incidents.
          </p>

          <h3 className="text-base font-semibold text-zinc-800 mb-2">Risk Labels</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Label</th>
                  <th className="text-left py-2 text-zinc-500 font-medium">Score Range</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600">
                <tr className="border-b border-zinc-100"><td className="py-2 pr-4">Low</td><td>0–25</td></tr>
                <tr className="border-b border-zinc-100"><td className="py-2 pr-4">Medium</td><td>26–50</td></tr>
                <tr className="border-b border-zinc-100"><td className="py-2 pr-4">High</td><td>51–75</td></tr>
                <tr><td className="py-2 pr-4">Critical</td><td>76–100</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-zinc-800 mb-2">Formula</h3>
          <code className="block bg-zinc-100 px-4 py-3 rounded text-sm text-zinc-700 mb-4">
            score = Σ (incident_base_score × recency_factor × confidence_factor), capped at 100
          </code>

          <h3 className="text-base font-semibold text-zinc-800 mb-2">Base Score by Incident Type</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Type</th>
                  <th className="text-left py-2 text-zinc-500 font-medium">Base Score</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600">
                {[
                  ["Misleading Promotion", 10],
                  ["Pump & Dump", 20],
                  ["Insider Dump", 25],
                  ["Scam", 35],
                  ["Rug Pull", 40],
                  ["Exit Scam", 45],
                  ["Other", 15],
                ].map(([type, score]) => (
                  <tr key={String(type)} className="border-b border-zinc-100">
                    <td className="py-2 pr-4">{type}</td>
                    <td>{score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-zinc-800 mb-2">Recency Factor</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Age</th>
                  <th className="text-left py-2 text-zinc-500 font-medium">Factor</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600">
                {[
                  ["Less than 6 months", "×1.0"],
                  ["6–18 months", "×0.85"],
                  ["18–36 months", "×0.65"],
                  ["More than 36 months", "×0.45"],
                ].map(([age, factor]) => (
                  <tr key={String(age)} className="border-b border-zinc-100">
                    <td className="py-2 pr-4">{age}</td>
                    <td>{factor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-zinc-800 mb-2">Confidence Factor (based on sources)</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Source Quality</th>
                  <th className="text-left py-2 text-zinc-500 font-medium">Factor</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600">
                {[
                  ["1 source, not archived", "×0.6"],
                  ["2+ sources OR 1 archived", "×0.8"],
                  ["3+ sources with at least 1 archived", "×1.0"],
                ].map(([quality, factor]) => (
                  <tr key={String(quality)} className="border-b border-zinc-100">
                    <td className="py-2 pr-4">{quality}</td>
                    <td>{factor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-zinc-600 text-sm">
            When a person or project is linked to multiple incidents, a diminishing multiplier
            (√(1 + (n-1) × 0.3)) is applied to prevent the score from becoming arbitrarily large
            while still reflecting the cumulative nature of multiple incidents.
          </p>

          <p className="text-zinc-600 text-sm mt-3">
            Scores are automatically recomputed every time an incident is approved, edited, or removed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Neutrality and Language Policy</h2>
          <p className="text-zinc-600 leading-relaxed">
            All entries must use neutral, evidence-based language. We do not assert legal guilt,
            make personal attacks, or present unverified claims as fact. Terms like
            &quot;alleged&quot;, &quot;reported&quot;, &quot;documented&quot;, &quot;linked&quot;, and &quot;associated&quot; are used
            throughout. Individuals are not convicted or judged on this platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Dispute and Right-to-Reply Process</h2>
          <p className="text-zinc-600 leading-relaxed mb-3">
            Any individual or entity mentioned on Grifter may:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-zinc-600">
            <li>
              <strong>Submit a dispute</strong> via the{" "}
              <a href="/dispute" className="underline hover:text-zinc-900">Dispute page</a>.
              Disputes are reviewed within 7 days. If a claim is found to be inaccurate, it will
              be corrected or removed.
            </li>
            <li>
              <strong>Submit a response</strong> (right to reply). Approved responses are
              displayed prominently on the relevant profile or incident page. Contact us via the
              dispute form to request a right-to-reply.
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
}
