import { NextRequest } from "next/server";

export function getSetupAuthFailureReason(_req: NextRequest) {
  void _req;
  return "Runtime setup is disabled";
}

export function isSetupAccessAllowed(_req: NextRequest) {
  void _req;
  return false;
}
