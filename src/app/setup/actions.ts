"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

export async function createAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { password: hashed },
    create: { email: normalizedEmail, password: hashed, role: "ADMIN" },
  });
}
