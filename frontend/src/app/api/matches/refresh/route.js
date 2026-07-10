import { NextResponse } from "next/server";
import predictions from "../../predictions.json";

function numToUUID(n) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

export async function POST() {
  return NextResponse.json({ message: "Refresh not available in static mode." }, { status: 200 });
}
