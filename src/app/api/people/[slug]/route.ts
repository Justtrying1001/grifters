import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const person = await prisma.person.findUnique({
    where: { slug },
    include: {
      incidents: {
        where: { incident: { status: "APPROVED" } },
        include: {
          incident: {
            include: { sources: true },
          },
        },
        orderBy: { incident: { date: "desc" } },
      },
      projects: {
        include: { project: true },
      },
    },
  });

  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(person);
}
