import { NextResponse } from "next/server";
import predictions from "../predictions.json";

function numToUUID(n) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

export async function GET() {
  try {
    // 1. Tenta buscar os dados em tempo real da ESPN Scoreboard API
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard", {
      next: { revalidate: 15 }, // Cache de 15 segundos
    });

    if (!res.ok) throw new Error(`ESPN API returned status ${res.status}`);
    const data = await res.json();
    const events = data.events || [];

    const matches = events.map((e) => {
      const comp = e.competitions?.[0] || {};
      const competitors = comp.competitors || [];
      const homeComp = competitors.find((c) => c.homeAway === "home") || {};
      const awayComp = competitors.find((c) => c.homeAway === "away") || {};

      const homeTeam = homeComp.team || {};
      const awayTeam = awayComp.team || {};

      const rawStatus = comp.status?.type?.state || "pre";
      const status = rawStatus === "pre" ? "SCHEDULED" : rawStatus === "in" ? "LIVE" : "FINISHED";

      const homeScore = homeComp.score !== undefined ? parseInt(homeComp.score) : null;
      const awayScore = awayComp.score !== undefined ? parseInt(awayComp.score) : null;

      // Gera o mesmo ID UUID v4 que usamos para casar com as predições
      const matchId = parseInt(e.id);
      const uuid = numToUUID(matchId);

      return {
        id: uuid,
        homeTeamName: homeTeam.displayName || "Home Team",
        homeTeamLogo: homeTeam.logo || "https://a.espncdn.com/i/teamlogos/countries/500/generic.png",
        awayTeamName: awayTeam.displayName || "Away Team",
        awayTeamLogo: awayTeam.logo || "https://a.espncdn.com/i/teamlogos/countries/500/generic.png",
        matchStatus: status,
        matchDate: e.date || new Date().toISOString(),
        matchRound: comp.season?.slug || "Copa do Mundo",
        homeScore: status !== "SCHEDULED" ? homeScore : null,
        awayScore: status !== "SCHEDULED" ? awayScore : null,
        apiFootballId: matchId,
      };
    });

    return NextResponse.json(matches, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("ESPN Live Fetch failed, falling back to static predictions.json:", error);

    // Fallback: serve os dados originais mapeados estaticamente de predictions.json
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
}

export async function POST() {
  return NextResponse.json({ message: "Sync not available in static mode." }, { status: 200 });
}
