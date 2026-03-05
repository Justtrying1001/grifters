import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAuditLog() {
  await requireAdmin();

  const logs = await prisma.adminAuditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { admin: { select: { email: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Audit Log</h1>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {logs.length === 0 && (
          <div className="py-8 text-center text-zinc-400 text-sm">No audit log entries yet.</div>
        )}
        {logs.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Time</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Admin</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Action</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Entity Type</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Entity ID</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 text-xs">{log.admin.email}</td>
                  <td className="px-4 py-3">
                    <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs text-zinc-700">
                      {log.action}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{log.entityType}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{log.entityId.slice(0, 12)}...</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-xs truncate">
                    {JSON.stringify(log.metadata) !== "{}" && (
                      <code className="text-xs text-zinc-400">
                        {JSON.stringify(log.metadata).slice(0, 80)}
                      </code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
