import { NextResponse } from "next/server";
import predictions from "../predictions.json";

function numToUUID(n) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

export async function GET() {
  try {
    // 1. Calcula dinamicamente o intervalo de datas (hoje até daqui a 7 dias)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}${m}${d}`;
    };

    const datesStr = `${formatDate(today)}-${formatDate(nextWeek)}`;
    
    // 2. Busca na ESPN Scoreboard API com o intervalo de datas
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${datesStr}`, {
      next: { revalidate: 15 }, // Cache de 15 segundos
    });

    if (!res.ok) throw new Error(`ESPN API returned status ${res.status}`);
    const data = await res.json();
    const events = data.events || [];

    const matches = events
      .map((e) => {
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

        // Filtra placeholders (times ainda não definidos)
        const homeName = homeTeam.displayName || "";
        const awayName = awayTeam.displayName || "";
        const placeholderKws = ["winner", "loser", "tbd", "to be decided", "quarterfinal", "semifinal", "vencedor", "perdedor", "definir"];
        if (placeholderKws.some(kw => homeName.toLowerCase().includes(kw) || awayName.toLowerCase().includes(kw))) {
          return null;
        }

        const matchId = parseInt(e.id);
        const uuid = numToUUID(matchId);

        return {
          id: uuid,
          homeTeamName: homeName || "Home Team",
          homeTeamLogo: homeTeam.logo || "https://a.espncdn.com/i/teamlogos/countries/500/generic.png",
          awayTeamName: awayName || "Away Team",
          awayTeamLogo: awayTeam.logo || "https://a.espncdn.com/i/teamlogos/countries/500/generic.png",
          matchStatus: status,
          matchDate: e.date || new Date().toISOString(),
          matchRound: comp.season?.slug || "Copa do Mundo",
          homeScore: status !== "SCHEDULED" ? homeScore : null,
          awayScore: status !== "SCHEDULED" ? awayScore : null,
          apiFootballId: matchId,
        };
      })
      .filter(Boolean); // Remove matches que foram filtradas (placeholders)

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
