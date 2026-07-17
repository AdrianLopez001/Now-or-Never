/**
 * ProbEngine Math Utilities
 * Core mathematical engine for vig removal, EV calculation, Kelly Criterion, and Monte Carlo simulation.
 */

/**
 * Remove Vig using the Proportional (Multiplicative) method.
 * @param {number[]} odds - Decimal odds array (e.g., [2.10, 3.40, 3.80])
 * @returns {number[]} Normalized probabilities
 */
export function removeVigProportional(odds) {
  const implied = odds.map(o => o > 0 ? 1 / o : 0);
  const sum = implied.reduce((acc, v) => acc + v, 0);
  if (sum <= 0) return odds.map(() => 0);
  return implied.map(p => p / sum);
}

/**
 * Remove Vig using the Logarithmic (Power) method.
 * Finds a power 'k' such that sum(p_i^k) = 1.
 * @param {number[]} odds - Decimal odds array
 * @returns {number[]} Normalized probabilities
 */
export function removeVigLogarithmic(odds) {
  const implied = odds.map(o => o > 0 ? 1 / o : 0).filter(p => p > 0);
  if (implied.length === 0) return odds.map(() => 0);
  
  const sum = implied.reduce((acc, v) => acc + v, 0);
  if (sum <= 1) {
    // No vig or negative vig, return proportional
    return removeVigProportional(odds);
  }

  // Solve for k using bisection search
  let low = 0.1;
  let high = 15.0;
  let k = 1.0;
  
  for (let iter = 0; iter < 100; iter++) {
    k = (low + high) / 2;
    const testSum = implied.reduce((acc, p) => acc + Math.pow(p, k), 0);
    
    if (Math.abs(testSum - 1.0) < 1e-7) {
      break;
    }
    
    if (testSum < 1.0) {
      // Decrease k to increase testSum
      high = k;
    } else {
      // Increase k to decrease testSum
      low = k;
    }
  }

  // Map back to the original array structure (including zeros)
  return odds.map(o => o > 0 ? Math.pow(1 / o, k) : 0);
}

/**
 * Remove Vig using Shin's Method.
 * Assumes a portion 'z' of informed bettors. Solves for z and returns true probabilities.
 * @param {number[]} odds - Decimal odds array
 * @returns {number[]} Normalized probabilities
 */
export function removeVigShin(odds) {
  const d = odds.map(o => o > 0 ? 1 / o : 0);
  const sumD = d.reduce((acc, v) => acc + v, 0);
  
  if (sumD <= 1) {
    return removeVigProportional(odds);
  }

  // Solves for informed bettor ratio 'z' in interval [0, 0.99]
  let low = 0.0;
  let high = 0.9999;
  let z = 0.0;
  let probs = [];

  for (let iter = 0; iter < 80; iter++) {
    z = (low + high) / 2;
    probs = [];
    let sumP = 0;
    
    const oneMinusZ = 1.0 - z;
    const zSquared = z * z;

    for (let i = 0; i < d.length; i++) {
      if (d[i] <= 0) {
        probs.push(0);
        continue;
      }
      // Shin formulation:
      // p_i = (sqrt(z^2 + 4 * (1 - z) * (d_i^2 / sumD)) - z) / (2 * (1 - z))
      const numerator = Math.sqrt(zSquared + 4 * oneMinusZ * ((d[i] * d[i]) / sumD)) - z;
      const val = numerator / (2 * oneMinusZ);
      probs.push(val);
      sumP += val;
    }

    if (Math.abs(sumP - 1.0) < 1e-7) {
      break;
    }

    if (sumP > 1.0) {
      // If sum of probabilities is too high, increase z (more informed ratio = higher cost/vig adjustment)
      low = z;
    } else {
      high = z;
    }
  }

  return probs;
}

/**
 * Remove vig based on selected method name.
 * @param {number[]} odds - Decimal odds array
 * @param {string} method - 'proportional' | 'logarithmic' | 'shin'
 * @returns {number[]} Normalized probabilities
 */
export function removeVig(odds, method = "shin") {
  switch (method.toLowerCase()) {
    case "proportional":
    case "multiplicative":
      return removeVigProportional(odds);
    case "logarithmic":
    case "power":
      return removeVigLogarithmic(odds);
    case "shin":
    default:
      return removeVigShin(odds);
  }
}

/**
 * Calculate Expected Value (EV) of a bet.
 * @param {number} pReal - Estimated true probability of winning (0 to 1)
 * @param {number} odd - Offered decimal odd (e.g., 2.15)
 * @returns {number} Expected value (e.g., 0.05 for +5% EV)
 */
export function calculateEV(pReal, odd) {
  if (odd <= 1) return -1;
  return (pReal * odd) - 1;
}

/**
 * Calculate recommended stake fraction using Kelly Criterion.
 * @param {number} pReal - True win probability (0 to 1)
 * @param {number} odd - Offered decimal odd
 * @param {object} options - Options containing kellyFraction and maxExposurePercent
 * @param {number} bankroll - Current bankroll amount
 * @returns {object} { fraction, amount, ev }
 */
export function calculateKellyStake(pReal, odd, options = {}, bankroll = 1000) {
  const kellyFraction = options.kellyFraction !== undefined ? options.kellyFraction : 0.25; // default 1/4 Kelly
  const maxExposurePercent = options.maxExposurePercent !== undefined ? options.maxExposurePercent : 0.05; // default 5% max
  
  const ev = calculateEV(pReal, odd);
  if (ev <= 0 || odd <= 1) {
    return { fraction: 0, amount: 0, ev };
  }

  // Kelly formula: f* = EV / (odd - 1)
  const fullKelly = ev / (odd - 1);
  let recommendedFraction = fullKelly * kellyFraction;

  // Apply maximum exposure cap
  if (recommendedFraction > maxExposurePercent) {
    recommendedFraction = maxExposurePercent;
  }

  // Clean fraction below zero
  if (recommendedFraction < 0) {
    recommendedFraction = 0;
  }

  return {
    fraction: recommendedFraction,
    amount: Math.round(recommendedFraction * bankroll * 100) / 100,
    ev
  };
}

/**
 * Runs a Monte Carlo simulation of bankroll growth.
 * @param {object} params - { initialBankroll, numBets, numSimulations, averageOdd, averageEV, kellyFraction, maxExposurePercent, ruinThreshold }
 * @returns {object} Simulation statistics and sample paths
 */
export function runMonteCarlo(params = {}) {
  const initialBankroll = params.initialBankroll || 1000;
  const numBets = params.numBets || 200;
  const numSimulations = params.numSimulations || 1000;
  const averageOdd = params.averageOdd || 2.0;
  const averageEV = params.averageEV || 0.05; // 5% edge
  const kellyFraction = params.kellyFraction || 0.25;
  const maxExposurePercent = params.maxExposurePercent || 0.05;
  const ruinThreshold = params.ruinThreshold || 100; // Ruin definition (e.g. dropping below R$ 100)

  // Calculate win probability from average odd and EV
  // EV = p * odd - 1 => p = (EV + 1) / odd
  const winProb = (averageEV + 1) / averageOdd;

  const samplePaths = [];
  const finalBankrolls = [];
  let ruinCount = 0;
  let totalMaxDrawdown = 0;

  // We want to save 10 paths for visual rendering
  const samplePathIndices = new Set();
  while (samplePathIndices.size < Math.min(10, numSimulations)) {
    samplePathIndices.add(Math.floor(Math.random() * numSimulations));
  }

  for (let s = 0; s < numSimulations; s++) {
    let currentBankroll = initialBankroll;
    const path = [currentBankroll];
    let peak = currentBankroll;
    let maxDrawdown = 0;
    let ruined = false;

    for (let b = 0; b < numBets; b++) {
      if (currentBankroll <= ruinThreshold) {
        currentBankroll = 0;
        ruined = true;
      }

      if (currentBankroll <= 0) {
        currentBankroll = 0;
        path.push(0);
        continue;
      }

      // Calculate stake for this bet
      // Kelly stake based on current bankroll
      const fullKelly = averageEV / (averageOdd - 1);
      let stakeFraction = fullKelly * kellyFraction;
      if (stakeFraction > maxExposurePercent) stakeFraction = maxExposurePercent;
      if (stakeFraction < 0) stakeFraction = 0;

      const stakeAmount = currentBankroll * stakeFraction;

      // Simulate bet outcome
      const win = Math.random() < winProb;
      if (win) {
        currentBankroll += stakeAmount * (averageOdd - 1);
      } else {
        currentBankroll -= stakeAmount;
      }

      // Update Peak & Drawdown
      if (currentBankroll > peak) {
        peak = currentBankroll;
      } else {
        const drawdown = (peak - currentBankroll) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      path.push(Math.round(currentBankroll * 100) / 100);
    }

    if (ruined || currentBankroll <= ruinThreshold) {
      ruinCount++;
    }

    finalBankrolls.push(currentBankroll);
    totalMaxDrawdown += maxDrawdown;

    if (samplePathIndices.has(s)) {
      samplePaths.push(path);
    }
  }

  // Sort final bankrolls to get percentiles
  finalBankrolls.sort((a, b) => a - b);
  
  const p10 = finalBankrolls[Math.floor(numSimulations * 0.10)];
  const p50 = finalBankrolls[Math.floor(numSimulations * 0.50)]; // Median
  const p90 = finalBankrolls[Math.floor(numSimulations * 0.90)];
  const averageFinal = finalBankrolls.reduce((a, b) => a + b, 0) / numSimulations;

  return {
    ruinProbability: ruinCount / numSimulations,
    averageMaxDrawdown: totalMaxDrawdown / numSimulations,
    percentile10: p10,
    percentile50: p50,
    percentile90: p90,
    averageFinal: averageFinal,
    samplePaths: samplePaths
  };
}

/**
 * Automatically generates 3 betting strategies (Safe, Moderate, Risky) to hit a target profit.
 * @param {object[]} matches - Array of matches
 * @param {object} predictions - Predictions keyed by match ID
 * @param {number} targetProfit - Amount user wants to win in R$
 * @returns {object[]} Array containing 3 strategy objects
 */
export function generateStrategies(matches, predictions, targetProfit = 50) {
  // 1. Gather all single selections from all matches
  const selections = [];
  
  matches.forEach(m => {
    const pred = predictions[m.id];
    if (!pred) return;

    // Helper to add a selection
    const addSel = (marketLabel, selectionLabel, marketKey, pReal) => {
      if (pReal <= 0 || pReal >= 1) return;
      // Calculate realistic odd with a 5% vig applied
      const odd = Math.round((1 / (pReal * 1.05)) * 100) / 100;
      if (odd <= 1.02) return;
      
      selections.push({
        matchId: m.id,
        homeTeamName: m.homeTeamName,
        awayTeamName: m.awayTeamName,
        marketLabel,
        selectionLabel,
        marketKey,
        pReal,
        odd,
        ev: pReal * odd - 1
      });
    };

    // 1X2
    addSel("Resultado Final", `Vitória ${m.homeTeamName}`, "probHomeWin", pred.probHomeWin);
    addSel("Resultado Final", "Empate", "probDraw", pred.probDraw);
    addSel("Resultado Final", `Vitória ${m.awayTeamName}`, "probAwayWin", pred.probAwayWin);

    // BTTS
    addSel("Ambos Marcam", "Ambos Marcam: Sim", "probBttsYes", pred.probBttsYes);
    addSel("Ambos Marcam", "Ambos Marcam: Não", "probBttsNo", pred.probBttsNo || (1.0 - pred.probBttsYes));

    // Over/Under 2.5
    addSel("Total de Gols", "Over 2.5 Gols", "probOver25", pred.probOver25);
    addSel("Total de Gols", "Under 2.5 Gols", "probUnder25", pred.probUnder25 || (1.0 - pred.probOver25));

    // Corners Over 9.5
    addSel("Escanteios", "Over 9.5 Escanteios", "probOver95Corners", pred.probOver95Corners);

    // Cards Over 4.5
    addSel("Cartões", "Over 4.5 Cartões", "probOver45Cards", pred.probOver45Cards);
  });

  if (selections.length === 0) {
    return [];
  }

  // Helper to format option
  const buildOption = (label, selList) => {
    const combinedProb = selList.reduce((acc, s) => acc * s.pReal, 1.0);
    const combinedOdd = Math.round(selList.reduce((acc, s) => acc * s.odd, 1.0) * 100) / 100;
    
    // Stake = TargetProfit / (Odd - 1)
    const stake = combinedOdd > 1 
      ? Math.round((targetProfit / (combinedOdd - 1)) * 100) / 100 
      : 0;
    const payout = Math.round((stake * combinedOdd) * 100) / 100;
    const ev = combinedProb * combinedOdd - 1;

    return {
      label,
      winProbability: combinedProb,
      odd: combinedOdd,
      ev,
      selections: selList,
      stake,
      payout,
      targetProfit
    };
  };

  // --- 1. SEGURA (Safe Strategy): Probability >= 70% ---
  // Pick the highest probability single selection
  const safeCandidate = [...selections]
    .sort((a, b) => b.pReal - a.pReal)[0];
  
  const safeOption = buildOption("Segura", safeCandidate ? [safeCandidate] : []);

  // --- 2. MODERADA (Moderate Strategy): Probability between 50% and 69% ---
  // We look for a double combo (2 selections from different matches) that yields p in [0.50, 0.69]
  const sortedSels = [...selections].sort((a, b) => b.pReal - a.pReal);
  let moderateList = [];
  
  // Try to find a combination of 2 games
  for (let i = 0; i < sortedSels.length; i++) {
    for (let j = i + 1; j < sortedSels.length; j++) {
      const s1 = sortedSels[i];
      const s2 = sortedSels[j];
      if (s1.matchId === s2.matchId) continue;
      
      const pCombo = s1.pReal * s2.pReal;
      if (pCombo >= 0.50 && pCombo <= 0.69) {
        moderateList = [s1, s2];
        break;
      }
    }
    if (moderateList.length > 0) break;
  }

  // Fallback if no 2-game combo fits the range: pick a single selection in that range, or the next best
  if (moderateList.length === 0) {
    const singleMod = selections.find(s => s.pReal >= 0.50 && s.pReal <= 0.69) 
                   || selections.find(s => s.pReal >= 0.40 && s.pReal < 0.50)
                   || safeCandidate;
    moderateList = singleMod ? [singleMod] : [];
  }

  const moderateOption = buildOption("Moderada", moderateList);

  // --- 3. ARRISCADA (Risky Strategy): Probability between 25% and 49% ---
  // Combine 3 distinct selections from different matches to form a parlay in [0.25, 0.49]
  let riskyList = [];
  
  for (let i = 0; i < sortedSels.length; i++) {
    for (let j = i + 1; j < sortedSels.length; j++) {
      for (let k = j + 1; k < sortedSels.length; k++) {
        const s1 = sortedSels[i];
        const s2 = sortedSels[j];
        const s3 = sortedSels[k];
        
        // Ensure distinct matches
        if (s1.matchId === s2.matchId || s1.matchId === s3.matchId || s2.matchId === s3.matchId) continue;
        
        const pCombo = s1.pReal * s2.pReal * s3.pReal;
        if (pCombo >= 0.25 && pCombo <= 0.49) {
          riskyList = [s1, s2, s3];
          break;
        }
      }
      if (riskyList.length > 0) break;
    }
    if (riskyList.length > 0) break;
  }

  // Fallback if no 3-game combo: try 2 games
  if (riskyList.length === 0) {
    for (let i = 0; i < sortedSels.length; i++) {
      for (let j = i + 1; j < sortedSels.length; j++) {
        const s1 = sortedSels[i];
        const s2 = sortedSels[j];
        if (s1.matchId === s2.matchId) continue;
        const pCombo = s1.pReal * s2.pReal;
        if (pCombo >= 0.25 && pCombo <= 0.49) {
          riskyList = [s1, s2];
          break;
        }
      }
      if (riskyList.length > 0) break;
    }
  }

  if (riskyList.length === 0) {
    const singleRisk = selections.find(s => s.pReal >= 0.25 && s.pReal <= 0.49)
                    || selections.sort((a,b) => a.pReal - b.pReal)[0]; // pick lowest pReal
    riskyList = singleRisk ? [singleRisk] : [];
  }

  const riskyOption = buildOption("Arriscada", riskyList);

  return [safeOption, moderateOption, riskyOption];
}

export function calculateGoalMetrics({
  capital,
  targetProfit,
  days,
  riskProfile = "conservative",
  betsPerDay = 1,
  calcMode = "fixed"
}) {
  const cap = parseFloat(capital) || 0;
  const target = parseFloat(targetProfit) || 0;
  const d = parseInt(days) || 0;
  const bpd = parseInt(betsPerDay) || 1;

  if (cap <= 0 || target <= 0 || d <= 0 || bpd <= 0) {
    return { error: "Todos os valores devem ser maiores que zero e o prazo em dias maior ou igual a 1." };
  }

  // Get risk profile percentage
  let riskPct = 0.01; // default conservative
  if (riskProfile === "moderate") {
    riskPct = 0.02;
  } else if (riskProfile === "aggressive") {
    riskPct = 0.05; // 5% limit
  }

  const stake = Math.round(cap * riskPct * 100) / 100;
  const totalBets = d * bpd;

  let odd = 1.0;
  let prob = 0.0;
  let profitPerBet = 0.0;

  if (calcMode === "fixed") {
    profitPerBet = target / totalBets;
    odd = 1 + (profitPerBet / stake);
    prob = 1 / odd;
  } else {
    // Compound interest mode: F = P * (1 + riskPct * (odd - 1))^N
    // factor = (F / P)^(1 / N)
    // factor = 1 + riskPct * (odd - 1)
    // odd = 1 + (factor - 1) / riskPct
    const finalTarget = cap + target;
    const growthFactor = Math.pow(finalTarget / cap, 1 / totalBets);
    const growthRate = growthFactor - 1;
    odd = 1 + (growthRate / riskPct);
    prob = 1 / odd;
    profitPerBet = stake * (odd - 1);
  }

  // Round results
  const roundedOdd = Math.round(odd * 100) / 100;
  const roundedProb = Math.round(prob * 1000) / 1000;
  const roundedProfitPerBet = Math.round(profitPerBet * 100) / 100;

  // Run feasibility check (guardrails)
  const alerts = [];
  if (roundedOdd < 1.10) {
    alerts.push({
      type: "warning",
      message: "A odd necessária é muito baixa (< 1.10). Sugerimos aumentar a meta de lucro ou diminuir o prazo/número de apostas para fazer as operações valerem a pena."
    });
  }
  if (roundedOdd > 2.50) {
    alerts.push({
      type: "danger",
      message: "A odd necessária é muito alta (> 2.50) para ser batida de forma consistente com stake seguro. Sugerimos estender o prazo, reduzir a meta de lucro ou aumentar as apostas diárias."
    });
  }
  if (riskProfile === "aggressive") {
    alerts.push({
      type: "info",
      message: "Atenção: O perfil Agressivo (5% de stake) aumenta severamente o risco de ruína da banca em sequências de perdas. Monitore seus drawdowns de perto."
    });
  }
  if (target > cap) {
    alerts.push({
      type: "danger",
      message: "Meta de Lucro crítica! Projetar um lucro maior do que o capital inicial (dobrar a banca ou mais) exige taxas de acerto fora de qualquer padrão seguro de gestão."
    });
  }

  return {
    stake,
    riskPct,
    totalBets,
    odd: roundedOdd,
    probEquilibrium: roundedProb,
    profitPerBet: roundedProfitPerBet,
    alerts
  };
}
