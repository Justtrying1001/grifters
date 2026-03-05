import { prisma } from "./prisma";

const WINDOW_HOURS = 24;
const MAX_SUBMISSIONS = 3;

export async function checkRateLimit(
  ip: string,
  action: string
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  // Clean up old windows
  await prisma.rateLimit.deleteMany({
    where: {
      ip,
      action,
      windowEnd: { lt: now },
    },
  });

  // Get or create current window
  const existing = await prisma.rateLimit.findFirst({
    where: {
      ip,
      action,
      windowEnd: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!existing) {
    await prisma.rateLimit.create({
      data: { ip, action, count: 1, windowEnd },
    });
    return { allowed: true, remaining: MAX_SUBMISSIONS - 1 };
  }

  if (existing.count >= MAX_SUBMISSIONS) {
    return { allowed: false, remaining: 0 };
  }

  await prisma.rateLimit.update({
    where: { id: existing.id },
    data: { count: existing.count + 1 },
  });

  return { allowed: true, remaining: MAX_SUBMISSIONS - existing.count - 1 };
}
