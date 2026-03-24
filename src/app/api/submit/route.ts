import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/slug";
import { IncidentType } from "@prisma/client";

const HCAPTCHA_VERIFY_URL = "https://hcaptcha.com/siteverify";

async function verifyHCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) return true; // skip in dev if not configured

  const res = await fetch(HCAPTCHA_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // Rate limit
  const { allowed, remaining } = await checkRateLimit(ip, "submit");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 3 submissions per 24 hours." },
      { status: 429 }
    );
  }

  const body = await req.json();

  // Validate captcha
  const captchaValid = await verifyHCaptcha(body.captchaToken ?? "");
  if (!captchaValid) {
    return NextResponse.json(
      { error: "Captcha verification failed." },
      { status: 400 }
    );
  }

  // Validate required fields
  const { type, date, summary, narrative, involvedText, sources, contactEmail } = body;

  if (!type || !date || !summary || !narrative) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  if (!sources || sources.length < 1) {
    return NextResponse.json(
      { error: "At least one source URL is required." },
      { status: 400 }
    );
  }

  if (summary.length > 250) {
    return NextResponse.json(
      { error: "Summary must be 250 characters or fewer." },
      { status: 400 }
    );
  }

  if (narrative.length > 2000) {
    return NextResponse.json(
      { error: "Narrative must be 2000 characters or fewer." },
      { status: 400 }
    );
  }

  // Generate slug
  const dateStr = new Date(date).toISOString().slice(0, 7);
  const baseSlug = `${slugify(summary.slice(0, 40))}-${dateStr}`;
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.incident.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const incident = await prisma.incident.create({
    data: {
      slug,
      type: type as IncidentType,
      date: new Date(date),
      summary,
      narrative: involvedText
        ? `${narrative}\n\n**Involved parties (submitted):** ${involvedText}`
        : narrative,
      status: "PENDING",
      submitterEmail: contactEmail ?? null,
      submitterIp: ip,
      sources: {
        create: sources.map((s: { url: string; title: string; excerpt?: string }) => ({
          url: s.url,
          title: s.title || s.url,
          excerpt: s.excerpt ?? null,
          addedBy: "submitter",
        })),
      },
    },
  });

  return NextResponse.json(
    { success: true, id: incident.id, remaining },
    { status: 201 }
  );
}
