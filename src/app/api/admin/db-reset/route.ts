import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Runtime setup/reset is disabled" },
    { status: 410 },
  );
}
