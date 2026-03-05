import { NextRequest } from "next/server";

function getProvidedSetupSecret(req: NextRequest) {
  const headerSecret = req.headers.get("x-setup-secret");
  if (headerSecret) return headerSecret;

  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim();
  }

  return null;
}

export function isSetupAccessAllowed(req: NextRequest) {
  const expected = process.env.SETUP_SECRET;
  if (!expected) return false;

  const setupEnabled = process.env.ENABLE_SETUP === "true" || process.env.NODE_ENV !== "production";
  if (!setupEnabled) return false;

  const provided = getProvidedSetupSecret(req);
  if (!provided) return false;

  return provided === expected;
}
