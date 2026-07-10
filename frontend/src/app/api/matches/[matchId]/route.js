import { NextResponse } from "next/server";
import predictions from "../../predictions.json";

function numToUUID(n) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

export async function GET(request, { params }) {
  const { matchId } = params;

  const pred = predictions.find(
    (p, i) => numToUUID(p.matchApiFootballId || i + 1) === matchId
  );

  if (!pred) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const matchUUID = numToUUID(pred.matchApiFootballId);

  const match = {
    id: matchUUID,
    homeTeamName: pred.homeTeamName,
    homeTeamLogo: pred.homeTeamLogo,
    awayTeamName: pred.awayTeamName,
    awayTeamLogo: pred.awayTeamLogo,
    matchStatus: pred.matchStatus,
    matchDate: pred.matchDate,
    matchRound: pred.matchRound,
    homeScore: pred.homeScore,
    awayScore: pred.awayScore,
    apiFootballId: pred.matchApiFootballId,
  };

  return NextResponse.json(match, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
