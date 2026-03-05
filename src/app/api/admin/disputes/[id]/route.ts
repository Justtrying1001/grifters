import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, resolvedNote } = body;

  const existing = await prisma.dispute.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.dispute.update({
    where: { id },
    data: {
      status: status ?? existing.status,
      resolvedNote: resolvedNote ?? existing.resolvedNote,
    },
  });

  const adminUser = session.user as { id: string };
  await logAuditAction({
    adminId: adminUser.id,
    action: `dispute.${status?.toLowerCase() ?? "update"}`,
    entityType: "INCIDENT",
    entityId: id,
    metadata: { newStatus: status, resolvedNote },
  });

  return NextResponse.json(updated);
}
