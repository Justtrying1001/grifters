import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function toStoredAdminEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return "";
  return normalized.includes("@") ? normalized : `${normalized}@admin.local`;
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { identifier, email, password } = await req.json();
  const inputIdentifier = typeof identifier === "string" && identifier.trim()
    ? identifier
    : typeof email === "string"
      ? email
      : "";

  const storedEmail = toStoredAdminEmail(inputIdentifier);

  if (!storedEmail || !password || password.length < 8) {
    return NextResponse.json({ error: "Identifiant et mot de passe requis (min 8 caractères)" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: storedEmail },
    update: { password: hashed },
    create: { email: storedEmail, password: hashed, role: "ADMIN" },
  });

  return NextResponse.json({ ok: true });
}
