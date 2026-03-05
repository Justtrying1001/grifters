"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function toStoredAdminEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return "";
  return normalized.includes("@") ? normalized : `${normalized}@admin.local`;
}

export async function resetDb() {
  await prisma.adminAuditLog.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.response.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.source.deleteMany();
  await prisma.incidentPerson.deleteMany();
  await prisma.incidentProject.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.personProject.deleteMany();
  await prisma.person.deleteMany();
  await prisma.project.deleteMany();
}

export async function createAdmin(identifier: string, password: string) {
  const storedEmail = toStoredAdminEmail(identifier);
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: storedEmail },
    update: { password: hashed },
    create: { email: storedEmail, password: hashed, role: "ADMIN" },
  });
}
