import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminAuditLog({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { email: true } } },
    }),
    prisma.adminAuditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + PAGE_SIZE, total);

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

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <p>Showing {pageStart}-{pageEnd} of {total} entries</p>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/audit-log?page=${Math.max(1, page - 1)}`}
              aria-disabled={page === 1}
              className={`rounded border border-zinc-300 px-3 py-1.5 text-zinc-700 ${page === 1 ? "pointer-events-none opacity-50" : "hover:bg-zinc-50"}`}
            >
              Previous
            </Link>
            <span className="text-zinc-600">Page {page} / {totalPages}</span>
            <Link
              href={`/admin/audit-log?page=${Math.min(totalPages, page + 1)}`}
              aria-disabled={page >= totalPages}
              className={`rounded border border-zinc-300 px-3 py-1.5 text-zinc-700 ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-zinc-50"}`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
