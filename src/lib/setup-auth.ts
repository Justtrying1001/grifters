import { NextRequest } from "next/server";

function getProvidedSetupSecret(req: NextRequest) {
  const headerSecret = req.headers.get("x-setup-secret")?.trim() || req.headers.get("setup-secret")?.trim();
  if (headerSecret) return headerSecret;

  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim();
  }

  // Compat fallback (non-production only) for older clients/tests.
  const querySecret = req.nextUrl.searchParams.get("secret")?.trim();
  if (querySecret && process.env.VERCEL_ENV !== "production" && process.env.NODE_ENV !== "production") {
    return querySecret;
  }

  return null;
}

function isRuntimeSetupEnabled() {
  if (process.env.ENABLE_SETUP === "true") return true;

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") return true;

  return process.env.NODE_ENV !== "production";
}

export function getSetupAuthFailureReason(req: NextRequest) {
  const expected = process.env.SETUP_SECRET?.trim();
  if (!expected) {
    // Developer experience fallback: allow setup outside production when no secret is configured.
    if (process.env.VERCEL_ENV !== "production" || process.env.NODE_ENV !== "production") {
      return null;
    }
    return "SETUP_SECRET manquant";
  }

  if (!isRuntimeSetupEnabled()) return "Setup désactivé dans cet environnement";

  const provided = getProvidedSetupSecret(req);
  if (!provided) return "Secret setup non fourni";

  if (provided !== expected) return "Secret setup invalide";

  return null;
}

export function isSetupAccessAllowed(req: NextRequest) {
  return getSetupAuthFailureReason(req) === null;
}
