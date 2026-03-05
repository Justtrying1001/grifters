import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password } = await req.json();
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || !password || password.length < 8) {
    return NextResponse.json({ error: "Email et mot de passe requis (min 8 caractères)" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { password: hashed },
    create: { email: normalizedEmail, password: hashed, role: "ADMIN" },
  });

  return NextResponse.json({ ok: true });
}
