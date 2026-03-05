import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditAction } from "@/lib/audit";
import { slugify } from "@/lib/slug";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, aliases, roles, socials, description } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  let slug = slugify(name);
  let attempt = 0;
  while (await prisma.person.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${slugify(name)}-${attempt}`;
  }

  const person = await prisma.person.create({
    data: {
      slug,
      name,
      aliases: aliases ?? [],
      roles: roles ?? [],
      socials: socials ?? {},
      description: description ?? null,
    },
  });

  const adminUser = session.user as { id: string };
  await logAuditAction({
    adminId: adminUser.id,
    action: "person.create",
    entityType: "PERSON",
    entityId: person.id,
    metadata: { name, slug },
  });

  return NextResponse.json(person, { status: 201 });
}
