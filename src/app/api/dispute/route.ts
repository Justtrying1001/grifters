import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { targetUrl, reason, evidenceUrls, submitterEmail } = body;

  if (!targetUrl || !reason) {
    return NextResponse.json(
      { error: "Target URL and reason are required." },
      { status: 400 }
    );
  }

  await prisma.dispute.create({
    data: {
      targetUrl,
      reason,
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
      submitterEmail: submitterEmail ?? null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
