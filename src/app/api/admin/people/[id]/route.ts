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

  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, aliases, roles, socials, description } = body;

  const updated = await prisma.person.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(aliases !== undefined && { aliases }),
      ...(roles !== undefined && { roles }),
      ...(socials !== undefined && { socials }),
      ...(description !== undefined && { description }),
    },
  });

  const adminUser = session.user as { id: string };
  await logAuditAction({
    adminId: adminUser.id,
    action: "person.update",
    entityType: "PERSON",
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
  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.person.delete({ where: { id } });

  const adminUser = session.user as { id: string };
  await logAuditAction({
    adminId: adminUser.id,
    action: "person.delete",
    entityType: "PERSON",
    entityId: id,
    metadata: { name: existing.name, slug: existing.slug },
  });

  return NextResponse.json({ success: true });
}
