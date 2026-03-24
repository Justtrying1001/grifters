export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">Methodology</h1>
      <p className="text-zinc-500 mb-10">How we collect, review, score, and verify entries in the Grifter database.</p>

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
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Evidence Status</h2>
          <p className="text-zinc-600 leading-relaxed mb-4">
            Every incident, person, and project on Grifter is assigned one of three evidence statuses.
            These statuses reflect the quality and verifiability of the evidence we have on file —
            they do not constitute legal determinations.
          </p>

          <div className="space-y-4">
            <div className="border border-zinc-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">🔍 Alleged</span>
              </div>
              <p className="text-sm text-zinc-600 mt-2">
                The incident has been reported by credible sources but has not been independently
                confirmed through on-chain data or external verification. This is the default status
                for newly imported or submitted incidents. Alleged incidents still appear on profiles
                but do not contribute to the risk score.
              </p>
            </div>

            <div className="border border-zinc-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-green-800 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">✅ Verified</span>
              </div>
              <p className="text-sm text-zinc-600 mt-2">
                The incident has been confirmed through on-chain evidence (transaction hashes
                verified via Etherscan or equivalent block explorer), corroborating reports from
                multiple independent sources, or other objective verification. Only Verified incidents
                contribute to the risk score.
              </p>
            </div>

            <div className="border border-zinc-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-red-800 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">⚠️ Contested</span>
              </div>
              <p className="text-sm text-zinc-600 mt-2">
                The subject of the profile has submitted a formal dispute or response that raises
                substantive questions about the accuracy of the reported information. Contested
                profiles display a prominent yellow banner and a link to the submitted response.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Source Types</h2>
          <p className="text-zinc-600 leading-relaxed mb-3">
            Each source attached to an incident is classified by type:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Type</th>
                  <th className="text-left py-2 text-zinc-500 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600">
                {[
                  ["External Report", "Journalism, investigative threads, or third-party reporting."],
                  ["On-chain Analysis", "Direct analysis of blockchain transaction data."],
                  ["Archived Screenshot", "Archived or cached evidence from social media or web pages."],
                  ["Victim Testimony", "First-person accounts from individuals affected by the incident."],
                ].map(([type, desc]) => (
                  <tr key={String(type)} className="border-b border-zinc-100">
                    <td className="py-2 pr-4 font-medium">{type}</td>
                    <td>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">On-Chain Verification</h2>
          <p className="text-zinc-600 leading-relaxed mb-3">
            When an incident is imported or submitted with Ethereum transaction hashes, Grifter
            automatically:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-zinc-600">
            <li>Stores the transaction hash and generates a link to the relevant block explorer (Etherscan for Ethereum).</li>
            <li>Sets the incident&apos;s evidence status to <strong>Verified</strong> if at least one transaction hash is present.</li>
            <li>Optionally confirms each hash against the Etherscan API (requires <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">ETHERSCAN_API_KEY</code>) via the <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">db:verify:onchain</code> script, marking records as <em>externally confirmed</em>.</li>
          </ol>
          <p className="text-zinc-600 leading-relaxed mt-3">
            Unconfirmed hashes are still shown on the incident page — the &quot;confirmed&quot; badge
            indicates Etherscan returned a successful receipt for the transaction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Source Archiving</h2>
          <p className="text-zinc-600 leading-relaxed">
            To prevent link rot and ensure evidence cannot be silently deleted, Grifter archives
            all source URLs via <strong>archive.ph</strong>. The <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">db:archive:sources</code> script
            processes each unarchived source and saves the archive URL alongside the original. Archived
            links are displayed on incident pages labeled &quot;Archived&quot;. URLs that are already
            archive.ph or web.archive.org links are skipped.
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
            Each person and project receives a risk score from 0–100. The score is computed
            automatically based only on their linked <strong>Verified</strong> incidents. Alleged
            incidents appear on the profile but do not contribute to the score.
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
            Only Verified incidents are included in the calculation.
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
              be corrected or removed. If the dispute raises substantive questions, the profile
              status may be changed to Contested.
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
