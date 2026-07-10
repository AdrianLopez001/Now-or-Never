import { NextResponse } from "next/server";
import predictions from "../../../predictions.json";

function numToUUID(n) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

function adjustProbabilitiesLive(preProbs, homeScore, awayScore, status) {
  const pInit = {
    home: preProbs.probHomeWin,
    draw: preProbs.probDraw,
    away: preProbs.probAwayWin,
    btts_yes: preProbs.probBttsYes,
    btts_no: preProbs.probBttsNo || (1.0 - preProbs.probBttsYes),
    over25: preProbs.probOver25,
    under25: preProbs.probUnder25 || (1.0 - preProbs.probOver25),
    over05: preProbs.probOver05,
    under35: preProbs.probUnder35,
    corners: preProbs.probOver95Corners,
    cards: preProbs.probOver45Cards
  };

  if (status === "SCHEDULED" || homeScore === null || awayScore === null) {
    return pInit;
  }

  const h = homeScore;
  const a = awayScore;
  const diff = h - a;

  let pH = pInit.home;
  let pD = pInit.draw;
  let pA = pInit.away;

  let pHNew, pDNew, pANew;

  if (diff === 0) {
    pDNew = Math.min(0.95, pD + 0.15);
    const remaining = 1.0 - pDNew;
    const ratio = (pH + pA) > 0 ? pH / (pH + pA) : 0.5;
    pHNew = remaining * ratio;
    pANew = remaining * (1.0 - ratio);
  } else if (diff > 0) {
    if (diff === 1) {
      pHNew = pH + 0.55 * (1.0 - pH);
    } else if (diff === 2) {
      pHNew = pH + 0.85 * (1.0 - pH);
    } else {
      pHNew = 0.99;
    }
    pHNew = Math.max(pH, Math.min(0.999, pHNew));
    const remaining = 1.0 - pHNew;
    const ratio = (pD + pA) > 0 ? pD / (pD + pA) : 0.5;
    pDNew = remaining * ratio;
    pANew = remaining * (1.0 - ratio);
  } else {
    const absDiff = Math.abs(diff);
    if (absDiff === 1) {
      pANew = pA + 0.55 * (1.0 - pA);
    } else if (absDiff === 2) {
      pANew = pA + 0.85 * (1.0 - pA);
    } else {
      pANew = 0.99;
    }
    pANew = Math.max(pA, Math.min(0.999, pANew));
    const remaining = 1.0 - pANew;
    const ratio = (pD + pH) > 0 ? pD / (pD + pH) : 0.5;
    pDNew = remaining * ratio;
    pHNew = remaining * (1.0 - ratio);
  }

  const total = pHNew + pDNew + pANew;
  pHNew /= total;
  pDNew /= total;
  pANew /= total;

  let bttsYes, bttsNo;
  if (h > 0 && a > 0) {
    bttsYes = 0.999;
    bttsNo = 0.001;
  } else {
    bttsYes = pInit.btts_yes;
    bttsNo = 1.0 - bttsYes;
  }

  let over25, under25;
  const totalGoals = h + a;
  if (totalGoals >= 3) {
    over25 = 0.999;
    under25 = 0.001;
  } else if (totalGoals === 2) {
    over25 = 0.85;
    under25 = 0.15;
  } else if (totalGoals === 1) {
    over25 = 0.55;
    under25 = 0.45;
  } else {
    over25 = pInit.over25;
    under25 = 1.0 - over25;
  }

  let over05;
  if (totalGoals >= 1) {
    over05 = 0.999;
  } else {
    over05 = pInit.over05;
  }

  return {
    home: pHNew,
    draw: pDNew,
    away: pANew,
    btts_yes: bttsYes,
    btts_no: bttsNo,
    over25: over25,
    under25: under25,
    over05: over05,
    under35: pInit.under35,
    corners: pInit.corners,
    cards: pInit.cards
  };
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const { matchId } = resolvedParams;

  // 1. Acha a predição estática correspondente
  const pred = predictions.find(
    (p, i) => numToUUID(p.matchApiFootballId || i + 1) === matchId
  );

  if (!pred) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let homeScore = pred.homeScore;
  let awayScore = pred.awayScore;
  let status = pred.matchStatus;

  // 2. Tenta obter o status atualizado do placar em tempo real da ESPN Scoreboard API
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard", {
      next: { revalidate: 15 },
    });

    if (res.ok) {
      const data = await res.json();
      const events = data.events || [];
      const liveMatch = events.find((e) => numToUUID(parseInt(e.id)) === matchId);

      if (liveMatch) {
        const comp = liveMatch.competitions?.[0] || {};
        const competitors = comp.competitors || [];
        const homeComp = competitors.find((c) => c.homeAway === "home") || {};
        const awayComp = competitors.find((c) => c.homeAway === "away") || {};

        const rawStatus = comp.status?.type?.state || "pre";
        status = rawStatus === "pre" ? "SCHEDULED" : rawStatus === "in" ? "LIVE" : "FINISHED";

        homeScore = homeComp.score !== undefined ? parseInt(homeComp.score) : null;
        awayScore = awayComp.score !== undefined ? parseInt(awayComp.score) : null;
      }
    }
  } catch (error) {
    console.error("ESPN Live Fetch in predictions API failed:", error);
  }

  // 3. Ajusta as probabilidades se a partida estiver rolando em tempo real
  const adjusted = adjustProbabilitiesLive(pred, homeScore, awayScore, status);

  const matchUUID = numToUUID(pred.matchApiFootballId);

  const response = {
    id: matchUUID,
    match: { id: matchUUID },
    probHomeWin: adjusted.home,
    probDraw: adjusted.draw,
    probAwayWin: adjusted.away,
    probBttsYes: adjusted.btts_yes,
    probBttsNo: adjusted.btts_no,
    probOver25: adjusted.over25,
    probUnder25: adjusted.under25,
    probOver05: adjusted.over05,
    probUnder35: adjusted.under35,
    probDoubleChance1X: adjusted.home + adjusted.draw, // Atualiza dinamicamente a chance dupla
    probDoubleChance12: adjusted.home + adjusted.away,
    probDoubleChanceX2: adjusted.draw + adjusted.away,
    probOver95Corners: adjusted.corners,
    probOver45Cards: adjusted.cards,
    brierScoreOutcome: pred.brierScoreOutcome,
    brierScoreBtts: pred.brierScoreBtts,
    brierScoreOver25: pred.brierScoreOver25,
    brierScoreOver05: pred.brierScoreOver05,
    brierScoreUnder35: pred.brierScoreUnder35,
    brierScoreCorners: pred.brierScoreCorners,
    brierScoreCards: pred.brierScoreCards,
    shapValuesJson: pred.shapValuesJson,
    explanationsJson: pred.explanationsJson,
    accessGranted: true,
  };

  return NextResponse.json(response, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
