import { NextRequest } from "next/server";

function getProvidedSetupSecret(req: NextRequest) {
  const headerSecret = req.headers.get("x-setup-secret")?.trim();
  if (headerSecret) return headerSecret;

  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim();
  }

  return null;
}

function isRuntimeSetupEnabled() {
  if (process.env.ENABLE_SETUP === "true") return true;

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") return true;

  return process.env.NODE_ENV !== "production";
}

export function isSetupAccessAllowed(req: NextRequest) {
  const expected = process.env.SETUP_SECRET?.trim();
  if (!expected) return false;

  if (!isRuntimeSetupEnabled()) return false;

  const provided = getProvidedSetupSecret(req);
  if (!provided) return false;

  return provided === expected;
}
