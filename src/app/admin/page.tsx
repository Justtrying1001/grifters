import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Inbox, AlertCircle, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  const [pendingIncidents, pendingDisputes, recentActions] = await Promise.all([
    prisma.incident.count({ where: { status: "PENDING" } }),
    prisma.dispute.count({ where: { status: "PENDING" } }),
    prisma.adminAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { email: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/queue" className="bg-white rounded-lg border border-zinc-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Inbox className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900">{pendingIncidents}</div>
              <div className="text-sm text-zinc-500">Pending Submissions</div>
            </div>
          </div>
        </Link>

        <Link href="/admin/disputes" className="bg-white rounded-lg border border-zinc-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900">{pendingDisputes}</div>
              <div className="text-sm text-zinc-500">Pending Disputes</div>
            </div>
          </div>
        </Link>

        <Link href="/admin/audit-log" className="bg-white rounded-lg border border-zinc-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900">{recentActions.length}</div>
              <div className="text-sm text-zinc-500">Recent Actions</div>
            </div>
          </div>
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Recent Admin Actions</h2>
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          {recentActions.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-sm">No actions yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Admin</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentActions.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-zinc-700">{log.admin.email}</td>
                    <td className="px-4 py-3">
                      <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs text-zinc-700">{log.action}</code>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{log.entityType} · {log.entityId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
