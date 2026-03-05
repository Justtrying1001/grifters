import { prisma } from "./prisma";
import { EntityType } from "@prisma/client";

export async function logAuditAction({
  adminId,
  action,
  entityType,
  entityId,
  metadata = {},
}: {
  adminId: string;
  action: string;
  entityType: EntityType;
  entityId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      metadata,
    },
  });
}
