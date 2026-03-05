import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RiskLabel } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const chain = searchParams.get("chain");
  const category = searchParams.get("category");
  const incidentType = searchParams.get("incidentType");
  const riskLabel = searchParams.get("riskLabel") as RiskLabel | null;
  const year = searchParams.get("year");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (riskLabel) where.riskLabel = riskLabel;
  if (chain) where.chain = { contains: chain, mode: "insensitive" };
  if (category) where.category = { contains: category, mode: "insensitive" };

  if (incidentType || year) {
    where.incidents = {
      some: {
        incident: {
          status: "APPROVED",
          ...(incidentType && { type: incidentType }),
          ...(year && {
            date: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${parseInt(year) + 1}-01-01`),
            },
          }),
        },
      },
    };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { riskScore: "desc" },
      include: {
        _count: { select: { incidents: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({ projects, total, page, limit });
}
