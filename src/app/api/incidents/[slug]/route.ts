import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const incident = await prisma.incident.findUnique({
    where: { slug, status: "APPROVED" },
    include: {
      sources: true,
      people: { include: { person: { select: { slug: true, name: true, riskLabel: true } } } },
      projects: {
        include: { project: { select: { slug: true, name: true, riskLabel: true } } },
      },
      responses: {
        where: { status: "APPROVED" },
      },
    },
  });

  if (!incident) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(incident);
}
