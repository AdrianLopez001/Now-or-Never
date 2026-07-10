import { NextResponse } from "next/server";

// Stub: no user system in static/Vercel mode
export async function GET() {
  return NextResponse.json([], { status: 200 });
}
