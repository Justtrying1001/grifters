import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSetupAccessAllowed } from "@/lib/setup-auth";

export async function POST(req: NextRequest) {
  if (!isSetupAccessAllowed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.adminAuditLog.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.response.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.source.deleteMany();
  await prisma.incidentPerson.deleteMany();
  await prisma.incidentProject.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.personProject.deleteMany();
  await prisma.person.deleteMany();
  await prisma.project.deleteMany();
  // Users are kept intentionally so admin access remains intact

  return NextResponse.json({ ok: true, message: "Database cleared" });
}
