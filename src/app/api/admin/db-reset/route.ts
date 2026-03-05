import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Protected by RESET_SECRET env var — call with ?secret=<RESET_SECRET>
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.RESET_SECRET || secret !== process.env.RESET_SECRET) {
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
  await prisma.user.deleteMany();

  return NextResponse.json({ ok: true, message: "Database cleared" });
}
