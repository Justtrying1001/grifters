import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, LayoutDashboard, Inbox, AlertCircle, Users, FolderOpen, FileText, ClipboardList, LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // Let the login page render without auth check
  return (
    <div className="min-h-screen bg-zinc-100">
      {session?.user ? (
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-56 min-h-screen bg-zinc-900 text-white fixed left-0 top-0 bottom-0 overflow-y-auto">
            <div className="p-4 border-b border-zinc-700">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-400" />
                <span className="font-bold text-sm">GRIFTER ADMIN</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 truncate">{session.user.email}</p>
            </div>

            <nav className="p-3 space-y-1">
              {[
                { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
                { href: "/admin/queue", label: "Review Queue", icon: Inbox },
                { href: "/admin/disputes", label: "Disputes", icon: AlertCircle },
                { href: "/admin/people", label: "People", icon: Users },
                { href: "/admin/projects", label: "Projects", icon: FolderOpen },
                { href: "/admin/incidents", label: "Incidents", icon: FileText },
                { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-4 left-3 right-3">
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <main className="ml-56 flex-1 p-8 min-h-screen">{children}</main>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
