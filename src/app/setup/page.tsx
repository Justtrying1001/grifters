export default function SetupPage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-xl mx-auto bg-zinc-800 border border-zinc-700 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-3">Setup disabled</h1>
        <p className="text-zinc-300">
          The runtime setup flow has been removed for security. Admin accounts must be managed via seed/database tooling.
        </p>
      </div>
    </div>
  );
}
