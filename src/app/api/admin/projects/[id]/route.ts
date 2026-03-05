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
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, chain, category, links, contractAddresses, description } = body;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(chain !== undefined && { chain }),
      ...(category !== undefined && { category }),
      ...(links !== undefined && { links }),
      ...(contractAddresses !== undefined && { contractAddresses }),
      ...(description !== undefined && { description }),
    },
  });

  const adminUser = session.user as { id: string };
  await logAuditAction({
    adminId: adminUser.id,
    action: "project.update",
    entityType: "PROJECT",
    entityId: id,
    metadata: { changes: body },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });

  const adminUser = session.user as { id: string };
  await logAuditAction({
    adminId: adminUser.id,
    action: "project.delete",
    entityType: "PROJECT",
    entityId: id,
    metadata: { name: existing.name, slug: existing.slug },
  });

  return NextResponse.json({ success: true });
}
