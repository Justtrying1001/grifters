import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ people: [], projects: [], incidents: [] });
  }

  const search = `%${q}%`;

  const [people, projects, incidents] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; slug: string; name: string; riskLabel: string; riskScore: number }>>`
      SELECT id, slug, name, "riskLabel", "riskScore"
      FROM people
      WHERE name ILIKE ${search}
        OR EXISTS (
          SELECT 1 FROM unnest(aliases) AS alias WHERE alias ILIKE ${search}
        )
      LIMIT 5
    `,
    prisma.$queryRaw<Array<{ id: string; slug: string; name: string; riskLabel: string; riskScore: number }>>`
      SELECT id, slug, name, "riskLabel", "riskScore"
      FROM projects
      WHERE name ILIKE ${search}
        OR description ILIKE ${search}
      LIMIT 5
    `,
    prisma.$queryRaw<Array<{ id: string; slug: string; type: string; summary: string; date: Date }>>`
      SELECT id, slug, type, summary, date
      FROM incidents
      WHERE status = 'APPROVED'
        AND (summary ILIKE ${search} OR narrative ILIKE ${search})
      LIMIT 5
    `,
  ]);

  return NextResponse.json({ people, projects, incidents });
}
