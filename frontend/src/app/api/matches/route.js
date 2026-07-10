import { NextResponse } from "next/server";
import predictions from "../predictions.json";

// Gera um UUID v4 determinístico a partir de um número
function numToUUID(n) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

export async function GET() {
  const matches = predictions.map((p, i) => ({
    id: numToUUID(p.matchApiFootballId || i + 1),
    homeTeamName: p.homeTeamName,
    homeTeamLogo: p.homeTeamLogo,
    awayTeamName: p.awayTeamName,
    awayTeamLogo: p.awayTeamLogo,
    matchStatus: p.matchStatus,
    matchDate: p.matchDate,
    matchRound: p.matchRound,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    apiFootballId: p.matchApiFootballId,
  }));

  return NextResponse.json(matches, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST() {
  // Em produção (Vercel) não há processo Python para chamar — retorna 200 sem-op
  return NextResponse.json({ message: "Sync not available in static mode." }, { status: 200 });
}
