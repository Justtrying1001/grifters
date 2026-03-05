import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditAction } from "@/lib/audit";
import { recomputeScoresForIncident } from "@/lib/recompute-scores";
import { IncidentStatus, IncidentType } from "@prisma/client";

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
  const { status, rejectionReason, type, date, summary, narrative } = body;

  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status as IncidentStatus;
  if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
  if (type) updateData.type = type as IncidentType;
  if (date) updateData.date = new Date(date);
  if (summary) updateData.summary = summary;
  if (narrative) updateData.narrative = narrative;

  const updated = await prisma.incident.update({
    where: { id },
    data: updateData,
  });

  const adminUser = session.user as { id: string };

  await logAuditAction({
    adminId: adminUser.id,
    action: `incident.${status?.toLowerCase() ?? "update"}`,
    entityType: "INCIDENT",
    entityId: id,
    metadata: { previousStatus: existing.status, newStatus: status, rejectionReason },
  });

  // Recompute risk scores if status changed
  if (status) {
    await recomputeScoresForIncident(id);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.incident.findUnique({
    where: { id },
    include: { people: true, projects: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.incident.delete({ where: { id } });

  const adminUser = session.user as { id: string };
  await logAuditAction({
    adminId: adminUser.id,
    action: "incident.delete",
    entityType: "INCIDENT",
    entityId: id,
    metadata: { slug: existing.slug },
  });

  // Recompute scores for affected entities
  await Promise.all([
    ...existing.people.map(async (ip) => {
      const { recomputePersonScore } = await import("@/lib/recompute-scores");
      return recomputePersonScore(ip.personId);
    }),
    ...existing.projects.map(async (ip) => {
      const { recomputeProjectScore } = await import("@/lib/recompute-scores");
      return recomputeProjectScore(ip.projectId);
    }),
  ]);

  return NextResponse.json({ success: true });
}
