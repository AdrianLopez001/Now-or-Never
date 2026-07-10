import { NextResponse } from "next/server";
import predictions from "../../../predictions.json";

function numToUUID(n) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

export async function GET(request, { params }) {
  const { matchId } = params;

  // Find the prediction whose generated UUID matches the requested matchId
  const pred = predictions.find(
    (p, i) => numToUUID(p.matchApiFootballId || i + 1) === matchId
  );

  if (!pred) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const matchUUID = numToUUID(pred.matchApiFootballId);

  const response = {
    id: matchUUID,
    match: { id: matchUUID },
    probHomeWin: pred.probHomeWin,
    probDraw: pred.probDraw,
    probAwayWin: pred.probAwayWin,
    probBttsYes: pred.probBttsYes,
    probBttsNo: pred.probBttsNo,
    probOver25: pred.probOver25,
    probUnder25: pred.probUnder25,
    probOver05: pred.probOver05,
    probUnder35: pred.probUnder35,
    probDoubleChance1X: pred.probDoubleChance1X,
    probDoubleChance12: pred.probDoubleChance12,
    probDoubleChanceX2: pred.probDoubleChanceX2,
    probOver95Corners: pred.probOver95Corners,
    probOver45Cards: pred.probOver45Cards,
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
