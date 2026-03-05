import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IncidentType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const type = searchParams.get("type") as IncidentType | null;
  const chain = searchParams.get("chain");
  const year = searchParams.get("year");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: "APPROVED" };

  if (type) where.type = type;
  if (year) {
    where.date = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${parseInt(year) + 1}-01-01`),
    };
  }
  if (chain) {
    where.projects = {
      some: { project: { chain: { contains: chain, mode: "insensitive" } } },
    };
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      include: {
        people: { include: { person: { select: { slug: true, name: true } } } },
        projects: {
          include: { project: { select: { slug: true, name: true } } },
        },
        _count: { select: { sources: true } },
      },
    }),
    prisma.incident.count({ where }),
  ]);

  return NextResponse.json({ incidents, total, page, limit });
}
