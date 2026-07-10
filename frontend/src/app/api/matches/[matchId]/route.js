import { NextResponse } from "next/server";
import predictions from "../../predictions.json";

function numToUUID(n) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const { matchId } = resolvedParams;

  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard", {
      next: { revalidate: 15 },
    });

    if (!res.ok) throw new Error(`ESPN API returned status ${res.status}`);
    const data = await res.json();
    const events = data.events || [];

    const liveMatch = events.find((e) => numToUUID(parseInt(e.id)) === matchId);

    if (liveMatch) {
      const comp = liveMatch.competitions?.[0] || {};
      const competitors = comp.competitors || [];
      const homeComp = competitors.find((c) => c.homeAway === "home") || {};
      const awayComp = competitors.find((c) => c.homeAway === "away") || {};

      const homeTeam = homeComp.team || {};
      const awayTeam = awayComp.team || {};

      const rawStatus = comp.status?.type?.state || "pre";
      const status = rawStatus === "pre" ? "SCHEDULED" : rawStatus === "in" ? "LIVE" : "FINISHED";

      const homeScore = homeComp.score !== undefined ? parseInt(homeComp.score) : null;
      const awayScore = awayComp.score !== undefined ? parseInt(awayComp.score) : null;

      return NextResponse.json({
        id: matchId,
        homeTeamName: homeTeam.displayName || "Home Team",
        homeTeamLogo: homeTeam.logo || "https://a.espncdn.com/i/teamlogos/countries/500/generic.png",
        awayTeamName: awayTeam.displayName || "Away Team",
        awayTeamLogo: awayTeam.logo || "https://a.espncdn.com/i/teamlogos/countries/500/generic.png",
        matchStatus: status,
        matchDate: liveMatch.date || new Date().toISOString(),
        matchRound: comp.season?.slug || "Copa do Mundo",
        homeScore: status !== "SCHEDULED" ? homeScore : null,
        awayScore: status !== "SCHEDULED" ? awayScore : null,
        apiFootballId: parseInt(liveMatch.id),
      });
    }
  } catch (error) {
    console.error("ESPN Live Single Match Fetch failed, falling back:", error);
  }

  // Fallback
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
