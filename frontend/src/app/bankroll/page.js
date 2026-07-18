"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef } from "react";
import { 
  removeVig, 
  calculateEV, 
  calculateKellyStake, 
  runMonteCarlo,
  generateStrategies
} from "../../utils/mathEngine";
import GoalCalculator from "../../components/GoalCalculator";

// Helper formats
const toBRL = (val) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
const pct = (val) => `${(val * 100).toFixed(1)}%`;

function buildBetFromStrategy(strategy) {
  let selectionNames = "";
  if (strategy.selections.length === 1) {
    const s = strategy.selections[0];
    selectionNames = s.selectionLabel;
  } else {
    selectionNames = strategy.selections.map(s => `${s.homeTeamName} (${s.selectionLabel})`).join(" + ");
  }

  const marketLabel = strategy.selections.length === 1 
    ? `Estratégia ${strategy.label} (Simples)` 
    : `Múltipla ${strategy.label} (${strategy.selections.length} jogos)`;

  return {
    id: "bet_strat_" + Date.now(),
    matchId: "strat_" + strategy.label.toLowerCase(),
    homeTeamName: strategy.selections[0].homeTeamName,
    awayTeamName: strategy.selections[0].awayTeamName,
    marketLabel: marketLabel,
    selectionLabel: selectionNames,
    odd: strategy.odd,
    pReal: strategy.winProbability,
    ev: strategy.ev,
    kellyStake: strategy.stake,
    stake: strategy.stake,
    closingOdd: Math.round(strategy.odd * (0.97 + Math.random() * 0.06) * 100) / 100, // mock closing line
    status: "PENDING",
    date: new Date().toISOString()
  };
}

function buildManualBet(match, marketLabel, selectionLabel, odd, systemPReal, calculatedEVVal, recommendedKellyAmount, stakeVal) {
  const closingOddMock = Math.round(odd * (0.96 + Math.random() * 0.08) * 100) / 100;
  return {
    id: "bet_" + Date.now(),
    matchId: match.id,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    marketLabel: marketLabel,
    selectionLabel: selectionLabel,
    odd: odd,
    pReal: systemPReal,
    ev: calculatedEVVal,
    kellyStake: recommendedKellyAmount,
    stake: stakeVal,
    closingOdd: closingOddMock,
    status: "PENDING",
    date: new Date().toISOString()
  };
}

export default function BankrollPage() {
  // --- State for Settings ---
  const [balance, setBalance] = useState(1000);
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'goal_calculator'
  const [tempBalanceInput, setTempBalanceInput] = useState("1000");
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [kellyFraction, setKellyFraction] = useState(0.25); // Default: 1/4 Kelly
  const [maxExposure, setMaxExposure] = useState(0.05); // Default: 5%
  const [evThreshold, setEvThreshold] = useState(0.03); // Default: 3% EV
  const [vigMethod, setVigMethod] = useState("shin"); // Default: Shin method

  // --- State for Strategy Builder (Gerador de Estratégias) ---
  const [targetProfitInput, setTargetProfitInput] = useState("50");
  const [targetProfit, setTargetProfit] = useState(50);

  // --- State for Quick Goal Simulator ---
  const [quickStake, setQuickStake] = useState("100");
  const [quickProfit, setQuickProfit] = useState("50");

  // --- State for Matches and Bets ---
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Calculator Form State ---
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("1x2"); // '1x2' | 'btts' | 'over25' | 'corners' | 'cards'
  
  // Dynamic odd inputs based on market
  const [oddsInput, setOddsInput] = useState({
    home: "",
    draw: "",
    away: "",
    yes: "",
    no: "",
    over: "",
    under: ""
  });

  const [selectedSelection, setSelectedSelection] = useState(""); // E.g., 'home', 'draw', 'away'
  const [customStake, setCustomStake] = useState("");
  
  // Results calculated live in form
  const [calculatedEVVal, setCalculatedEVVal] = useState(0);
  const [recommendedKelly, setRecommendedKelly] = useState({ fraction: 0, amount: 0 });
  const [rawPImplied, setRawPImplied] = useState(0);
  const [vigFreeP, setVigFreeP] = useState(0);
  const [systemPReal, setSystemPReal] = useState(0);

  // --- Monte Carlo Simulation State ---
  const [mcNumBets, setMcNumBets] = useState(100);
  const [mcNumSims, setMcNumSims] = useState(1000);
  const [mcAvgOdd, setMcAvgOdd] = useState(2.0);
  const [mcAvgEV, setMcAvgEV] = useState(0.05);
  const [mcResults, setMcResults] = useState(null);
  const canvasRef = useRef(null);

  // --- Feedback message state ---
  const [message, setMessage] = useState(null);

  // --- Load configs & data ---
  useEffect(() => {
    // Load config from localStorage
    const savedBalance = localStorage.getItem("now_or_never_bankroll_balance");
    if (savedBalance) {
      setBalance(parseFloat(savedBalance));
      setTempBalanceInput(savedBalance);
    }
    const savedKelly = localStorage.getItem("now_or_never_kelly_fraction");
    if (savedKelly) setKellyFraction(parseFloat(savedKelly));
    
    const savedExposure = localStorage.getItem("now_or_never_max_exposure");
    if (savedExposure) setMaxExposure(parseFloat(savedExposure));
    
    const savedEvThresh = localStorage.getItem("now_or_never_ev_threshold");
    if (savedEvThresh) setEvThreshold(parseFloat(savedEvThresh));
    
    const savedVigMethod = localStorage.getItem("now_or_never_vig_method");
    if (savedVigMethod) setVigMethod(savedVigMethod);

    const savedBets = localStorage.getItem("now_or_never_bets");
    if (savedBets) {
      try {
        setBets(JSON.parse(savedBets));
      } catch (e) {
        console.error("Error parsing saved bets", e);
      }
    }

    // Fetch matches from Next API
    const userId = localStorage.getItem("now_or_never_user_id");
    fetch("/api/matches")
      .then(res => res.json())
      .then(matchesData => {
        setMatches(matchesData);
        if (matchesData.length > 0) {
          setSelectedMatchId(matchesData[0].id);
        }
        
        // Fetch predictions for matches
        const promises = matchesData.map(m => {
          const url = userId ? `/api/predictions/match/${m.id}?userId=${userId}` : `/api/predictions/match/${m.id}`;
          return fetch(url)
            .then(res => res.ok ? res.json() : null)
            .then(pred => ({ matchId: m.id, pred }))
            .catch(() => ({ matchId: m.id, pred: null }));
        });
        return Promise.all(promises);
      })
      .then(predsList => {
        const predsMap = {};
        predsList.forEach(({ matchId, pred }) => {
          if (pred) predsMap[matchId] = pred;
        });
        setPredictions(predsMap);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading bankroll matches", err);
        setLoading(false);
      });
  }, []);

  // --- Save configs on change ---
  const saveBalance = (newVal) => {
    setBalance(newVal);
    localStorage.setItem("now_or_never_bankroll_balance", newVal.toString());
  };

  const handleKellyFractionChange = (val) => {
    setKellyFraction(val);
    localStorage.setItem("now_or_never_kelly_fraction", val.toString());
  };

  const handleMaxExposureChange = (val) => {
    setMaxExposure(val);
    localStorage.setItem("now_or_never_max_exposure", val.toString());
  };

  const handleEvThresholdChange = (val) => {
    setEvThreshold(val);
    localStorage.setItem("now_or_never_ev_threshold", val.toString());
  };

  const handleVigMethodChange = (val) => {
    setVigMethod(val);
    localStorage.setItem("now_or_never_vig_method", val);
  };

  const saveBetsToStorage = (newBets) => {
    setBets(newBets);
    localStorage.setItem("now_or_never_bets", JSON.stringify(newBets));
  };

  // --- EV & Kelly Live Calculations in Form ---
  useEffect(() => {
    if (!selectedMatchId || !selectedMarket) return;
    const pred = predictions[selectedMatchId];
    if (!pred) return;

    let pReal = 0;
    let oddsArray = [];
    let activeOdd = 0;
    let marketIndex = 0;

    if (selectedMarket === "1x2") {
      pReal = selectedSelection === "home" ? pred.probHomeWin 
            : selectedSelection === "draw" ? pred.probDraw 
            : pred.probAwayWin;
      
      const oH = parseFloat(oddsInput.home) || 0;
      const oD = parseFloat(oddsInput.draw) || 0;
      const oA = parseFloat(oddsInput.away) || 0;
      
      oddsArray = [oH, oD, oA];
      activeOdd = selectedSelection === "home" ? oH 
                : selectedSelection === "draw" ? oD 
                : oA;
      marketIndex = selectedSelection === "home" ? 0 
                  : selectedSelection === "draw" ? 1 
                  : 2;
    } else if (selectedMarket === "btts") {
      pReal = selectedSelection === "yes" ? pred.probBttsYes : pred.probBttsNo;
      const oY = parseFloat(oddsInput.yes) || 0;
      const oN = parseFloat(oddsInput.no) || 0;
      oddsArray = [oY, oN];
      activeOdd = selectedSelection === "yes" ? oY : oN;
      marketIndex = selectedSelection === "yes" ? 0 : 1;
    } else if (selectedMarket === "over25") {
      pReal = selectedSelection === "over" ? pred.probOver25 : pred.probUnder25;
      const oOv = parseFloat(oddsInput.over) || 0;
      const oUn = parseFloat(oddsInput.under) || 0;
      oddsArray = [oOv, oUn];
      activeOdd = selectedSelection === "over" ? oOv : oUn;
      marketIndex = selectedSelection === "over" ? 0 : 1;
    } else if (selectedMarket === "corners") {
      pReal = selectedSelection === "over" ? pred.probOver95Corners : (1 - pred.probOver95Corners);
      const oOv = parseFloat(oddsInput.over) || 0;
      const oUn = parseFloat(oddsInput.under) || 2.0; // default/fallback
      oddsArray = [oOv, oUn];
      activeOdd = selectedSelection === "over" ? oOv : oUn;
      marketIndex = selectedSelection === "over" ? 0 : 1;
    } else if (selectedMarket === "cards") {
      pReal = selectedSelection === "over" ? pred.probOver45Cards : (1 - pred.probOver45Cards);
      const oOv = parseFloat(oddsInput.over) || 0;
      const oUn = parseFloat(oddsInput.under) || 2.0;
      oddsArray = [oOv, oUn];
      activeOdd = selectedSelection === "over" ? oOv : oUn;
      marketIndex = selectedSelection === "over" ? 0 : 1;
    }

    setSystemPReal(pReal);

    // Filter array to ensure all odds are present to calculate vig removal
    const validOdds = oddsArray.every(o => o > 1);

    if (validOdds) {
      // Calculate vig-free probability
      const vigFreeProbs = removeVig(oddsArray, vigMethod);
      const vfP = vigFreeProbs[marketIndex] || 0;
      setVigFreeP(vfP);

      // Raw implied probability
      setRawPImplied(activeOdd > 0 ? 1 / activeOdd : 0);

      // Calculate EV and Kelly based on model's pReal vs offered odd
      const ev = calculateEV(pReal, activeOdd);
      setCalculatedEVVal(ev);

      const kelly = calculateKellyStake(pReal, activeOdd, {
        kellyFraction: kellyFraction,
        maxExposurePercent: maxExposure
      }, balance);
      setRecommendedKelly(kelly);
      
      // Auto fill custom stake with recommended Kelly amount on selection
      if (customStake === "" || customStake === "0") {
        setCustomStake(kelly.amount.toString());
      }
    } else {
      setVigFreeP(0);
      setRawPImplied(activeOdd > 0 ? 1 / activeOdd : 0);
      setCalculatedEVVal(0);
      setRecommendedKelly({ fraction: 0, amount: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMatchId, 
    selectedMarket, 
    selectedSelection, 
    oddsInput, 
    vigMethod, 
    kellyFraction, 
    maxExposure, 
    balance, 
    predictions
  ]);

  // Clean form when market changes
  useEffect(() => {
    if (selectedMarket === "1x2") {
      setSelectedSelection("home");
    } else if (selectedMarket === "btts") {
      setSelectedSelection("yes");
    } else {
      setSelectedSelection("over");
    }
    setOddsInput({
      home: "", draw: "", away: "",
      yes: "", no: "",
      over: "", under: ""
    });
    setCustomStake("");
  }, [selectedMarket]);

  // Fill default predictions as helper
  const handlePrefillOdds = () => {
    const pred = predictions[selectedMatchId];
    if (!pred) return;

    // Prefill using 1 / pReal + some vig (5%) as a placeholder helper
    const applyVig = (p) => (1 / (p * 1.05)).toFixed(2);

    if (selectedMarket === "1x2") {
      setOddsInput({
        ...oddsInput,
        home: applyVig(pred.probHomeWin),
        draw: applyVig(pred.probDraw),
        away: applyVig(pred.probAwayWin)
      });
    } else if (selectedMarket === "btts") {
      setOddsInput({
        ...oddsInput,
        yes: applyVig(pred.probBttsYes),
        no: applyVig(pred.probBttsNo)
      });
    } else if (selectedMarket === "over25") {
      setOddsInput({
        ...oddsInput,
        over: applyVig(pred.probOver25),
        under: applyVig(pred.probUnder25)
      });
    } else if (selectedMarket === "corners") {
      setOddsInput({
        ...oddsInput,
        over: applyVig(pred.probOver95Corners),
        under: applyVig(1 - pred.probOver95Corners)
      });
    } else if (selectedMarket === "cards") {
      setOddsInput({
        ...oddsInput,
        over: applyVig(pred.probOver45Cards),
        under: applyVig(1 - pred.probOver45Cards)
      });
    }
  };

  // --- Register strategy parlay or single bet ---
  const handleRegisterStrategyBet = (strategy) => {
    if (strategy.stake <= 0) return;
    if (strategy.stake > balance) {
      setMessage({ type: "error", text: "Saldo insuficiente para esta estratégia!" });
      return;
    }

    // Deduct stake from bankroll
    const newBalance = Math.max(0, balance - strategy.stake);
    saveBalance(newBalance);
    setTempBalanceInput(newBalance.toString());

    // Combine all info into a single parlay bet entry in historical tracking
    const newBet = buildBetFromStrategy(strategy);

    const updatedBets = [newBet, ...bets];
    saveBetsToStorage(updatedBets);

    setMessage({ type: "success", text: `Estratégia ${strategy.label} registrada com sucesso!` });
  };

  // --- Add Bet ---
  const handleAddBet = (e) => {
    e.preventDefault();
    if (!selectedMatchId) return;
    const match = matches.find(m => m.id === selectedMatchId);
    if (!match) return;

    const pred = predictions[selectedMatchId];
    let odd = 0;
    if (selectedMarket === "1x2") {
      odd = selectedSelection === "home" ? parseFloat(oddsInput.home)
          : selectedSelection === "draw" ? parseFloat(oddsInput.draw)
          : parseFloat(oddsInput.away);
    } else if (selectedMarket === "btts") {
      odd = selectedSelection === "yes" ? parseFloat(oddsInput.yes) : parseFloat(oddsInput.no);
    } else if (selectedMarket === "over25") {
      odd = selectedSelection === "over" ? parseFloat(oddsInput.over) : parseFloat(oddsInput.under);
    } else {
      odd = selectedSelection === "over" ? parseFloat(oddsInput.over) : parseFloat(oddsInput.under);
    }

    if (!odd || odd <= 1) {
      setMessage({ type: "error", text: "Insira odds válidas antes de salvar!" });
      return;
    }

    const stakeVal = parseFloat(customStake) || 0;
    if (stakeVal <= 0 || stakeVal > balance) {
      setMessage({ type: "error", text: "Stake inválida ou maior que o saldo disponível!" });
      return;
    }

    // Set Selection label
    let selectionLabel = "";
    if (selectedMarket === "1x2") {
      selectionLabel = selectedSelection === "home" ? `Vitória ${match.homeTeamName}`
                     : selectedSelection === "draw" ? "Empate"
                     : `Vitória ${match.awayTeamName}`;
    } else if (selectedMarket === "btts") {
      selectionLabel = selectedSelection === "yes" ? "Ambas Marcam: Sim" : "Ambas Marcam: Não";
    } else if (selectedMarket === "over25") {
      selectionLabel = selectedSelection === "over" ? "Over 2.5 Gols" : "Under 2.5 Gols";
    } else if (selectedMarket === "corners") {
      selectionLabel = selectedSelection === "over" ? "Over 9.5 Escanteios" : "Under 9.5 Escanteios";
    } else if (selectedMarket === "cards") {
      selectionLabel = selectedSelection === "over" ? "Over 4.5 Cartões" : "Under 4.5 Cartões";
    }

    const marketLabel = selectedMarket === "1x2" ? "Resultado Final"
                      : selectedMarket === "btts" ? "Ambos Marcam"
                      : selectedMarket === "over25" ? "Total de Gols"
                      : selectedMarket === "corners" ? "Escanteios"
                      : "Cartões";

    // Deduct stake from bankroll
    const newBalance = Math.max(0, balance - stakeVal);
    saveBalance(newBalance);
    setTempBalanceInput(newBalance.toString());

    const newBet = buildManualBet(
      match,
      marketLabel,
      selectionLabel,
      odd,
      systemPReal,
      calculatedEVVal,
      recommendedKelly.amount,
      stakeVal
    );

    const updatedBets = [newBet, ...bets];
    saveBetsToStorage(updatedBets);

    // Feedback
    setMessage({ type: "success", text: `Aposta de ${toBRL(stakeVal)} registrada com sucesso!` });
    setCustomStake("");
  };

  // --- Change Bet Status ---
  const handleResolveBet = (betId, newStatus) => {
    let balanceAdjustment = 0;
    const updatedBets = bets.map(b => {
      if (b.id !== betId) return b;
      
      // Revert previous adjustment if resolving an already resolved bet
      if (b.status === "WON") {
        balanceAdjustment -= b.stake * b.odd;
      } else if (b.status === "PENDING") {
        // deduction was already made on creation, so we only adjust based on new status
      } else if (b.status === "LOST") {
        // stake was already deducted, no return
      }

      // Apply new calculation
      if (newStatus === "WON") {
        balanceAdjustment += b.stake * b.odd;
      } else if (newStatus === "PENDING") {
        balanceAdjustment += b.stake; // return stake
      }

      return { ...b, status: newStatus };
    });

    saveBalance(Math.round((balance + balanceAdjustment) * 100) / 100);
    setTempBalanceInput((balance + balanceAdjustment).toString());
    saveBetsToStorage(updatedBets);
    setMessage({ type: "success", text: "Aposta atualizada e saldo da banca recalculado!" });
  };

  // --- Delete Bet ---
  const handleDeleteBet = (betId) => {
    const bet = bets.find(b => b.id === betId);
    if (!bet) return;

    let balanceAdjustment = 0;
    if (bet.status === "PENDING") {
      balanceAdjustment += bet.stake; // Return the locked stake
    }

    const updatedBets = bets.filter(b => b.id !== betId);
    saveBalance(Math.round((balance + balanceAdjustment) * 100) / 100);
    setTempBalanceInput((balance + balanceAdjustment).toString());
    saveBetsToStorage(updatedBets);
    setMessage({ type: "success", text: "Aposta removida." });
  };

  // --- Update Balance Manual Input ---
  const handleManualBalanceUpdate = (e) => {
    e.preventDefault();
    const val = parseFloat(tempBalanceInput);
    if (!isNaN(val) && val >= 0) {
      saveBalance(val);
      setIsEditingBalance(false);
      setMessage({ type: "success", text: `Saldo da banca atualizado para ${toBRL(val)}` });
    } else {
      setMessage({ type: "error", text: "Insira um valor numérico válido!" });
    }
  };

  // --- Historical Analytics Calculations ---
  const resolvedBets = bets.filter(b => b.status !== "PENDING");
  const totalInvested = bets.reduce((acc, b) => acc + b.stake, 0);
  
  // Profit calculations
  const totalReturns = bets.reduce((acc, b) => {
    if (b.status === "WON") return acc + (b.stake * b.odd);
    if (b.status === "PENDING") return acc + b.stake; // stake is locked
    return acc;
  }, 0);
  const netProfit = totalReturns - (bets.length > 0 ? bets.reduce((a,b)=>a+b.stake, 0) : 0);
  
  const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
  
  const wonBets = resolvedBets.filter(b => b.status === "WON").length;
  const winRate = resolvedBets.length > 0 ? wonBets / resolvedBets.length : 0;

  // CLV Calculation
  const clvSum = resolvedBets.reduce((acc, b) => {
    if (b.closingOdd && b.closingOdd > 0) {
      return acc + ((b.odd / b.closingOdd) - 1);
    }
    return acc;
  }, 0);
  const avgClv = resolvedBets.length > 0 ? clvSum / resolvedBets.length : 0;

  // Theoretical EV vs Real Profit curves
  const theoreticalEVProfit = bets.reduce((acc, b) => acc + (b.stake * b.ev), 0);

  // Brier Score Calculation
  const brierSum = resolvedBets.reduce((acc, b) => {
    const outcome = b.status === "WON" ? 1 : 0;
    return acc + Math.pow(b.pReal - outcome, 2);
  }, 0);
  const userBrierScore = resolvedBets.length > 0 ? brierSum / resolvedBets.length : 0;

  // --- Guardrail Status Checkers ---
  const isChasingLosses = () => {
    if (bets.length < 2) return false;
    const lastBet = bets[0];
    if (lastBet.status === "LOST") {
      const currentManualStake = parseFloat(customStake) || 0;
      const avgStake = bets.reduce((acc, b) => acc + b.stake, 0) / bets.length;
      // Alert if they place a bet manually that is 50% larger than average and larger than Kelly
      if (currentManualStake > avgStake * 1.5 && currentManualStake > recommendedKelly.amount * 1.1) {
        return true;
      }
    }
    return false;
  };

  const isMultipleOverMaxSelections = () => false; // Múltiplas não são salvas de forma encadeada diretamente, mas podemos simular.

  // --- Run Monte Carlo & Paint Canvas ---
  const handleMonteCarloSim = () => {
    // Collect average values from recorded bets if possible as standard fallback
    const avgOdd = resolvedBets.length > 0 
      ? resolvedBets.reduce((acc, b) => acc + b.odd, 0) / resolvedBets.length
      : mcAvgOdd;
    const avgEV = resolvedBets.length > 0
      ? resolvedBets.reduce((acc, b) => acc + b.ev, 0) / resolvedBets.length
      : mcAvgEV;

    const results = runMonteCarlo({
      initialBankroll: balance,
      numBets: mcNumBets,
      numSimulations: mcNumSims,
      averageOdd: avgOdd,
      averageEV: avgEV,
      kellyFraction: kellyFraction,
      maxExposurePercent: maxExposure,
      ruinThreshold: Math.max(10, balance * 0.1) // 10% of bankroll as ruin limit
    });

    setMcResults(results);
    paintCanvas(results.samplePaths, results.averageFinal);
  };

  const paintCanvas = (paths, avgFinal) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 45;

    // Find min and max values across all paths for scaling
    let maxVal = balance * 1.5;
    let minVal = 0;
    paths.forEach(p => {
      p.forEach(val => {
        if (val > maxVal) maxVal = val;
        if (val < minVal) minVal = val;
      });
    });

    // Drawing Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * (height - 2 * padding)) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // y-axis labels
      const labelVal = maxVal - (i * (maxVal - minVal)) / 5;
      ctx.fillStyle = "rgba(156, 163, 175, 0.7)";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText(Math.round(labelVal).toString(), 5, y + 3);
    }

    // x-axis labels (bets)
    const totalSteps = mcNumBets;
    for (let i = 0; i <= 4; i++) {
      const step = Math.round((i * totalSteps) / 4);
      const x = padding + (i * (width - 2 * padding)) / 4;
      ctx.fillText(`Aposta ${step}`, x - 20, height - 10);
    }

    // Plotting simulation lines
    paths.forEach((path, idx) => {
      ctx.beginPath();
      ctx.lineWidth = idx === 0 ? 2 : 1; // make first path bold
      // Gradient paths colors
      ctx.strokeStyle = `hsla(${(idx * 36) % 360}, 75%, 60%, 0.45)`;

      path.forEach((val, step) => {
        const x = padding + (step * (width - 2 * padding)) / totalSteps;
        const y = height - padding - ((val - minVal) * (height - 2 * padding)) / (maxVal - minVal);
        if (step === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });

    // Reference Initial Bankroll line
    ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    const initY = height - padding - ((balance - minVal) * (height - 2 * padding)) / (maxVal - minVal);
    ctx.beginPath();
    ctx.moveTo(padding, initY);
    ctx.lineTo(width - padding, initY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Re-run paint canvas on results change or resize
  useEffect(() => {
    if (mcResults) {
      paintCanvas(mcResults.samplePaths, mcResults.averageFinal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcResults]);

  // Clean feedback toast
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // --- Quick Simulator Calculations ---
  const qStake = parseFloat(quickStake) || 0;
  const qProfit = parseFloat(quickProfit) || 0;
  const quickTotalReturn = qStake + qProfit;
  const quickOdd = qStake > 0 ? (1 + qProfit / qStake) : 1.0;
  const quickProb = quickOdd > 0 ? (1 / quickOdd) : 0.0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast message */}
      {message && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border px-5 py-3 shadow-2xl text-sm font-semibold backdrop-blur-md transition-all duration-300
          ${message.type === "success" 
            ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300" 
            : "bg-rose-950/90 border-rose-500/40 text-rose-300"}`}
        >
          {message.type === "success" ? "✅ " : "❌ "}{message.text}
        </div>
      )}

      {/* Title block */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent border border-violet-500/20 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            ProbEngine
          </h1>
          <p className="mt-2 text-sm text-gray-400 max-w-2xl">
            Motor de decisão, cálculo de valor esperado (EV), Kelly Criterion e gerenciamento de banca baseado nas probabilidades de IA do sistema.
          </p>
        </div>

        {/* Configurations menu */}
        <div className="glass-panel rounded-2xl p-4 border border-gray-800 space-y-3 shrink-0 md:w-80">
          <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest">Ajustes ProbEngine</h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Remoção de Vig:</span>
              <select 
                value={vigMethod}
                onChange={(e) => handleVigMethodChange(e.target.value)}
                className="bg-gray-900 text-white rounded border border-gray-800 px-2 py-0.5"
              >
                <option value="shin">Método de Shin (Recomendado)</option>
                <option value="logarithmic">Método Logarítmico (Power)</option>
                <option value="proportional">Método Proporcional</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Fração de Kelly:</span>
              <select 
                value={kellyFraction}
                onChange={(e) => handleKellyFractionChange(parseFloat(e.target.value))}
                className="bg-gray-900 text-white rounded border border-gray-800 px-2 py-0.5"
              >
                <option value={1.0}>Kelly Cheio (1.0)</option>
                <option value={0.5}>Meio Kelly (0.50)</option>
                <option value={0.25}>1/4 Kelly (0.25)</option>
                <option value={0.10}>1/10 Kelly (0.10)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Exposição Max (%):</span>
              <select 
                value={maxExposure}
                onChange={(e) => handleMaxExposureChange(parseFloat(e.target.value))}
                className="bg-gray-900 text-white rounded border border-gray-800 px-2 py-0.5"
              >
                <option value={0.01}>1% da Banca</option>
                <option value={0.02}>2% da Banca</option>
                <option value={0.03}>3% da Banca</option>
                <option value={0.05}>5% da Banca</option>
                <option value={0.10}>10% da Banca</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Limiar Mínimo EV:</span>
              <select 
                value={evThreshold}
                onChange={(e) => handleEvThresholdChange(parseFloat(e.target.value))}
                className="bg-gray-900 text-white rounded border border-gray-800 px-2 py-0.5"
              >
                <option value={0.0}>Sem limite (EV &gt; 0)</option>
                <option value={0.02}>+2.0% EV</option>
                <option value={0.03}>+3.0% EV</option>
                <option value={0.05}>+5.0% EV</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-850 gap-6 mb-6">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all duration-300 border-b-2 select-none cursor-pointer ${
            activeTab === "dashboard"
              ? "border-violet-500 text-white"
              : "border-transparent text-gray-500 hover:text-gray-400"
          }`}
        >
          📊 Painel de Banca & Kelly
        </button>
        <button
          onClick={() => setActiveTab("goal_calculator")}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all duration-300 border-b-2 select-none cursor-pointer ${
            activeTab === "goal_calculator"
              ? "border-violet-500 text-white"
              : "border-transparent text-gray-500 hover:text-gray-400"
          }`}
        >
          🎯 Calculadora de Metas
        </button>
      </div>

      {activeTab === "dashboard" ? (
        <>
          {/* Financial stats summary panels */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Current bankroll balance */}
        <div className="glass-panel rounded-2xl p-5 border border-gray-800 flex flex-col justify-between col-span-2 lg:col-span-2">
          <div>
            <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider mb-2">Saldo da Banca</span>
            {isEditingBalance ? (
              <form onSubmit={handleManualBalanceUpdate} className="flex gap-2 items-center">
                <input 
                  type="text" 
                  value={tempBalanceInput} 
                  onChange={(e) => setTempBalanceInput(e.target.value)}
                  className="bg-gray-900 text-white text-xl font-black px-3 py-1.5 rounded-xl border border-violet-500/40 w-full"
                  autoFocus
                />
                <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">Salvar</button>
              </form>
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl font-black text-white">{toBRL(balance)}</span>
                <button 
                  onClick={() => setIsEditingBalance(true)}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded cursor-pointer"
                >
                  ✏️ Alterar
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 text-[10px] text-gray-500 border-t border-gray-800/60 pt-2 flex justify-between">
            <span>Locked (Apostas abertas):</span>
            <span className="font-bold text-gray-300">
              {toBRL(bets.filter(b=>b.status === "PENDING").reduce((acc, b) => acc + b.stake, 0))}
            </span>
          </div>
        </div>

        {/* ROI widget */}
        <div className="glass-panel rounded-2xl p-5 border border-gray-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider mb-2">ROI Acumulado</span>
            <span className={`text-2xl font-black ${roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
            </span>
          </div>
          <div className="text-[9px] text-gray-500 border-t border-gray-800/60 pt-2">
            Lucro: <span className={netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}>{toBRL(netProfit)}</span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="glass-panel rounded-2xl p-5 border border-gray-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider mb-2">Taxa de Acerto</span>
            <span className="text-2xl font-black text-white">
              {pct(winRate)}
            </span>
          </div>
          <div className="text-[9px] text-gray-500 border-t border-gray-800/60 pt-2">
            Acertos: {wonBets} / {resolvedBets.length}
          </div>
        </div>

        {/* Closing Line Value CLV */}
        <div className="glass-panel rounded-2xl p-5 border border-gray-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider mb-2">CLV Médio</span>
            <span className={`text-2xl font-black ${avgClv >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {avgClv >= 0 ? "+" : ""}{pct(avgClv)}
            </span>
          </div>
          <div className="text-[9px] text-gray-500 border-t border-gray-800/60 pt-2">
            Closing Line Value (Edge vs Fechamento)
          </div>
        </div>

        {/* User Model Brier Score */}
        <div className="glass-panel rounded-2xl p-5 border border-gray-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider mb-2">Brier Score Real</span>
            <span className="text-2xl font-black text-white">
              {resolvedBets.length > 0 ? userBrierScore.toFixed(4) : "—"}
            </span>
          </div>
          <div className="text-[9px] text-gray-500 border-t border-gray-800/60 pt-2">
            Métrica de calibração pessoal
          </div>
        </div>
      </div>
    {/* Target Profit Strategy Generator */}
      <div className="glass-panel rounded-3xl border border-gray-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-violet-500 to-indigo-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>🎯</span> Gerador de Estratégias por Meta de Lucro
            </h2>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Informe quanto deseja ganhar. O sistema selecionará e combinará automaticamente as melhores apostas para atingir sua meta com base no risco.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meta de Lucro:</span>
            <div className="flex gap-2">
              <input 
                type="number"
                value={targetProfitInput}
                onChange={(e) => {
                  setTargetProfitInput(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setTargetProfit(val);
                  }
                }}
                className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 w-28 text-sm font-black text-white focus:outline-none focus:border-violet-500 text-center"
                placeholder="R$ 50"
              />
              <span className="bg-gray-900/60 border border-gray-800 px-3 py-2 rounded-xl text-sm font-bold text-gray-400 flex items-center">
                BRL
              </span>
            </div>
          </div>
        </div>

        {/* Generate options */}
        {matches.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">Carregando jogos disponíveis...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {generateStrategies(matches, predictions, targetProfit).map(strat => {
              const themeColor = strat.label === "Segura" ? "emerald"
                               : strat.label === "Moderada" ? "violet"
                               : "amber";
              const borderColors = {
                emerald: "border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/5",
                violet: "border-violet-500/20 hover:border-violet-500/40 hover:shadow-violet-500/5",
                amber: "border-amber-500/20 hover:border-amber-500/40 hover:shadow-amber-500/5"
              };
              const bgBadge = {
                emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                violet: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
                amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              };
              const hoverBgs = {
                emerald: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/10",
                violet: "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/10",
                amber: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/10"
              };

              return (
                <div 
                  key={strat.label} 
                  className={`glass-panel flex flex-col justify-between rounded-2xl p-5 border transition-all duration-300 ${borderColors[themeColor]}`}
                >
                  <div className="space-y-4">
                    {/* Header: Label & combined metrics */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${bgBadge[themeColor]}`}>
                        {strat.label === "Segura" ? "🟢 Bet Segura" : strat.label === "Moderada" ? "🔵 Moderada" : "🟠 Arriscada"}
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 block">Confiança</span>
                        <span className="text-xs font-black text-white">{pct(strat.winProbability)}</span>
                      </div>
                    </div>

                    {/* Odd and targets info */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-950/40 rounded-xl p-3 border border-gray-900 text-center font-bold">
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">Odd Múltipla</span>
                        <span className="text-sm font-black text-white">{strat.odd.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">Retorno Estimado</span>
                        <span className={`text-sm font-black ${strat.ev > 0 ? "text-emerald-400" : "text-gray-400"}`}>
                          {strat.ev > 0 ? "+" : ""}{(strat.ev * 100).toFixed(0)}% EV
                        </span>
                      </div>
                    </div>

                    {/* Parlay/selections content */}
                    <div className="space-y-2 border-t border-gray-900/80 pt-3">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Jogos Combinados ({strat.selections.length})</span>
                      <div className="space-y-2.5">
                        {strat.selections.map((sel, idx) => (
                          <div key={idx} className="text-xs border-b border-gray-900/30 pb-2 last:border-b-0 last:pb-0">
                            <div className="font-bold text-white flex justify-between gap-2">
                              <span className="truncate max-w-[150px]">{sel.homeTeamName} vs {sel.awayTeamName}</span>
                              <span className="odd-chip">{sel.odd.toFixed(2)}</span>
                            </div>
                            <div className="text-[10px] text-violet-400 font-semibold mt-0.5">{sel.selectionLabel}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & dynamic stake required */}
                  <div className="mt-6 border-t border-gray-900/80 pt-4 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase font-bold">Aposta Necessária</span>
                        <span className="text-lg font-black text-white">{toBRL(strat.stake)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-500 block uppercase font-bold">Payout Total</span>
                        <span className="text-xs font-semibold text-gray-400">{toBRL(strat.payout)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRegisterStrategyBet(strat)}
                      className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider select-none cursor-pointer transition-all duration-300 shadow-md ${hoverBgs[themeColor]}`}
                    >
                      Aplicar Estratégia
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main interactive area: Calculator (Left) and Monte Carlo Simulation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Register Bet & Kelly Calculator */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-3xl border border-gray-800 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-indigo-500" />
            <h2 className="text-lg font-black text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <span>🧮</span> Calculadora de Valor (EV) & Kelly
            </h2>

            {matches.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">Carregando jogos disponíveis para simulação...</p>
            ) : (
              <form onSubmit={handleAddBet} className="space-y-4">
                
                {/* Match select */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">1. Selecionar Partida</label>
                    <select
                      value={selectedMatchId}
                      onChange={(e) => {
                        setSelectedMatchId(e.target.value);
                      }}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-violet-500"
                    >
                      {matches.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.homeTeamName} vs {m.awayTeamName} ({new Date(m.matchDate).toLocaleDateString("pt-BR", {day:"2-digit", month:"2-digit"})})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Market select */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">2. Selecionar Mercado</label>
                    <select
                      value={selectedMarket}
                      onChange={(e) => setSelectedMarket(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-violet-500"
                    >
                      <option value="1x2">Vencedor da Partida (1X2)</option>
                      <option value="btts">Ambos Marcam (BTTS)</option>
                      <option value="over25">Total de Gols (Mais/Menos 2.5)</option>
                      <option value="corners">Escanteios (Mais/Menos 9.5)</option>
                      <option value="cards">Cartões (Mais/Menos 4.5)</option>
                    </select>
                  </div>
                </div>

                {/* dynamic selection input */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">3. Escolher sua Seleção</label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedMarket === "1x2" && (
                      <>
                        {["home", "draw", "away"].map(sel => (
                          <button
                            key={sel}
                            type="button"
                            onClick={() => setSelectedSelection(sel)}
                            className={`py-2 px-3 rounded-xl border text-xs font-black capitalize transition-all select-none cursor-pointer
                              ${selectedSelection === sel 
                                ? "bg-violet-600/20 border-violet-500 text-violet-300" 
                                : "bg-gray-900/40 border-gray-800/80 text-gray-400 hover:border-gray-700"}`}
                          >
                            {sel === "home" ? "Casa (1)" : sel === "draw" ? "Empate (X)" : "Fora (2)"}
                          </button>
                        ))}
                      </>
                    )}
                    {selectedMarket === "btts" && (
                      <>
                        {["yes", "no"].map(sel => (
                          <button
                            key={sel}
                            type="button"
                            onClick={() => setSelectedSelection(sel)}
                            className={`py-2 px-3 rounded-xl border text-xs font-black capitalize transition-all select-none cursor-pointer
                              ${selectedSelection === sel 
                                ? "bg-violet-600/20 border-violet-500 text-violet-300" 
                                : "bg-gray-900/40 border-gray-800/80 text-gray-400 hover:border-gray-700"}`}
                          >
                            {sel === "yes" ? "Sim" : "Não"}
                          </button>
                        ))}
                      </>
                    )}
                    {selectedMarket !== "1x2" && selectedMarket !== "btts" && (
                      <>
                        {["over", "under"].map(sel => (
                          <button
                            key={sel}
                            type="button"
                            onClick={() => setSelectedSelection(sel)}
                            className={`py-2 px-3 rounded-xl border text-xs font-black capitalize transition-all select-none cursor-pointer
                              ${selectedSelection === sel 
                                ? "bg-violet-600/20 border-violet-500 text-violet-300" 
                                : "bg-gray-900/40 border-gray-800/80 text-gray-400 hover:border-gray-700"}`}
                          >
                            {sel === "over" ? "Mais (Over)" : "Menos (Under)"}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Odds inputs to perform Vig Removal */}
                <div className="bg-gray-950/40 rounded-2xl p-4 border border-gray-900/80 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      4. Inserir Odds do Mercado (Para remover Vig)
                    </span>
                    <button
                      type="button"
                      onClick={handlePrefillOdds}
                      className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/25 px-2 py-1 rounded hover:bg-violet-500/20 transition cursor-pointer"
                    >
                      🔮 Auto-Preencher Estático
                    </button>
                  </div>

                  {selectedMarket === "1x2" ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 block mb-1">Odd Casa (1)</label>
                        <input 
                          type="number" step="0.01" value={oddsInput.home} 
                          onChange={(e) => setOddsInput({ ...oddsInput, home: e.target.value })}
                          className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg px-3 py-2 text-xs" 
                          placeholder="e.g. 2.10"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 block mb-1">Odd Empate (X)</label>
                        <input 
                          type="number" step="0.01" value={oddsInput.draw} 
                          onChange={(e) => setOddsInput({ ...oddsInput, draw: e.target.value })}
                          className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg px-3 py-2 text-xs" 
                          placeholder="e.g. 3.40"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 block mb-1">Odd Fora (2)</label>
                        <input 
                          type="number" step="0.01" value={oddsInput.away} 
                          onChange={(e) => setOddsInput({ ...oddsInput, away: e.target.value })}
                          className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg px-3 py-2 text-xs" 
                          placeholder="e.g. 3.80"
                        />
                      </div>
                    </div>
                  ) : selectedMarket === "btts" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 block mb-1">Odd Sim</label>
                        <input 
                          type="number" step="0.01" value={oddsInput.yes} 
                          onChange={(e) => setOddsInput({ ...oddsInput, yes: e.target.value })}
                          className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg px-3 py-2 text-xs" 
                          placeholder="e.g. 1.80"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 block mb-1">Odd Não</label>
                        <input 
                          type="number" step="0.01" value={oddsInput.no} 
                          onChange={(e) => setOddsInput({ ...oddsInput, no: e.target.value })}
                          className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg px-3 py-2 text-xs" 
                          placeholder="e.g. 1.95"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 block mb-1">Odd Over</label>
                        <input 
                          type="number" step="0.01" value={oddsInput.over} 
                          onChange={(e) => setOddsInput({ ...oddsInput, over: e.target.value })}
                          className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg px-3 py-2 text-xs" 
                          placeholder="e.g. 1.90"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 block mb-1">Odd Under</label>
                        <input 
                          type="number" step="0.01" value={oddsInput.under} 
                          onChange={(e) => setOddsInput({ ...oddsInput, under: e.target.value })}
                          className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg px-3 py-2 text-xs" 
                          placeholder="e.g. 1.85"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Calculation breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-950/60 rounded-2xl p-4 border border-gray-900/80 text-xs font-semibold">
                  <div>
                    <span className="text-gray-500 text-[10px] block">Modelo IA (P Real)</span>
                    <span className="text-sm font-black text-white">{pct(systemPReal)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Mercado (P Implic)</span>
                    <span className="text-sm font-black text-gray-300">{pct(rawPImplied)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Mercado Líquido (Sem Vig)</span>
                    <span className="text-sm font-black text-violet-300">{pct(vigFreeP)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Valor Esperado (EV)</span>
                    <span className={`text-sm font-black ${calculatedEVVal > evThreshold ? "text-emerald-400" : calculatedEVVal > 0 ? "text-yellow-400" : "text-rose-400"}`}>
                      {calculatedEVVal > 0 ? "+" : ""}{(calculatedEVVal * 100).toFixed(1)}% EV
                    </span>
                  </div>
                </div>

                {/* Recommendations */}
                {calculatedEVVal > 0 ? (
                  <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">Entrada Recomendada</span>
                      <span className="text-xs text-gray-400">Com base nas regras do Critério de Kelly estabelecidas.</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Stake Ideal</span>
                      <span className="text-lg font-black text-emerald-300">{pct(recommendedKelly.fraction)} ({toBRL(recommendedKelly.amount)})</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-950/20 border border-rose-500/25 rounded-2xl p-4">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-0.5">⚠️ Rejeitado pelo Sistema</span>
                    <span className="text-xs text-gray-400">Esta seleção não possui valor esperado positivo em relação às probabilidades do modelo (EV &le; 0).</span>
                  </div>
                )}

                {/* Chasing Losses Guardrail warning */}
                {isChasingLosses() && (
                  <div className="bg-rose-950/50 border border-rose-500/30 rounded-2xl p-4 animate-pulse flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="text-xs font-black text-rose-400 uppercase tracking-wide">Aviso de Chasing Losses</h4>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Sua última aposta foi perdida. Você está aumentando sua stake manualmente em mais de 50% acima de sua média e além da recomendação do Kelly. Evite tentar recuperar perdas emocionais de forma agressiva!
                      </p>
                    </div>
                  </div>
                )}

                {/* Custom Stake & Submit */}
                <div className="flex flex-col sm:flex-row gap-4 items-end justify-between pt-2">
                  <div className="w-full sm:w-1/2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Stake da Aposta (R$)</label>
                    <input 
                      type="number" step="1" value={customStake}
                      onChange={(e) => setCustomStake(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-violet-500"
                      placeholder="e.g. 50"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full sm:w-1/2 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest select-none cursor-pointer transition-all duration-300
                      ${calculatedEVVal > 0 
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-gray-800/80 hover:bg-gray-800 text-gray-400 border border-gray-700"}`}
                  >
                    Registrar Aposta →
                  </button>
                </div>

              </form>
            )}
          </div>

          {/* Quick Entry Simulator Card */}
          <div className="glass-panel rounded-3xl border border-gray-800 p-6 shadow-xl relative overflow-hidden space-y-4">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500" />
            
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>⚡</span> Simulador Rápido de Entrada
              </h3>
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                Calcule instantaneamente a odd e a probabilidade de equilíbrio para uma aposta e retorno específicos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Quanto Quero Apostar (Stake)</label>
                <input
                  type="number"
                  value={quickStake}
                  onChange={(e) => setQuickStake(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                  placeholder="Ex: 100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Lucro Desejado (BRL)</label>
                <input
                  type="number"
                  value={quickProfit}
                  onChange={(e) => setQuickProfit(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                  placeholder="Ex: 50"
                />
              </div>
            </div>

            {/* Calculations display */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-3 text-center">
                <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Retorno Total</span>
                <span className="text-xs font-black text-white block">{toBRL(quickTotalReturn)}</span>
              </div>
              <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-3 text-center border-l-2 border-l-cyan-500/40">
                <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Odd Necessária</span>
                <span className="text-xs font-black text-white block">{quickOdd.toFixed(2)}</span>
              </div>
              <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-3 text-center">
                <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Confiança Mínima</span>
                <span className="text-xs font-black text-white block">{(quickProb * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Warnings and strategy limits */}
            <div className="pt-1">
              {qStake > balance * 0.05 ? (
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 text-[9px] text-rose-300 font-semibold flex gap-2">
                  <span>🚨</span>
                  <span>Exposição crítica da banca! Esta aposta representa <strong>{((qStake / balance) * 100).toFixed(1)}%</strong> da sua banca total. Para uma gestão profissional, evite arriscar mais de 5% em uma única entrada.</span>
                </div>
              ) : qStake > balance * 0.02 ? (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 text-[9px] text-amber-300 font-semibold flex gap-2">
                  <span>⚠️</span>
                  <span>Stake moderada (<strong>{((qStake / balance) * 100).toFixed(1)}%</strong> da banca). Certifique-se de que a aposta possui Valor Esperado (EV) positivo antes de operar.</span>
                </div>
              ) : (
                <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3 text-[9px] text-cyan-300 font-semibold flex gap-2">
                  <span>🛡️</span>
                  <span>Stake segura de <strong>{((qStake / balance) * 100).toFixed(1)}%</strong> da banca. Excelente controle de exposição.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Monte Carlo Simulation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-3xl border border-gray-800 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-cyan-500" />
            
            <h2 className="text-lg font-black text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <span>📊</span> Simulador de Banca (Monte Carlo)
            </h2>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Projeta o crescimento de longo prazo e o risco de ruína simulando milhares de trajetórias de banca.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5 text-xs font-semibold">
              <div>
                <label className="text-gray-500 block mb-1">Apostas na Simulação</label>
                <input 
                  type="number" value={mcNumBets} 
                  onChange={(e) => setMcNumBets(parseInt(e.target.value) || 100)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-gray-500 block mb-1">Número de Simulações</label>
                <input 
                  type="number" value={mcNumSims} 
                  onChange={(e) => setMcNumSims(parseInt(e.target.value) || 1000)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <button
              onClick={handleMonteCarloSim}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-xs font-black uppercase tracking-widest text-white hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer shadow-lg shadow-violet-500/10 mb-6"
            >
              Simular Crescimento de Banca
            </button>

            {/* Canvas for plotting */}
            <div className="relative rounded-2xl bg-gray-950/60 border border-gray-900 p-2 overflow-hidden mb-6 h-60">
              <canvas 
                ref={canvasRef} 
                width={500} 
                height={230} 
                className="w-full h-full object-contain"
              />
              {!mcResults && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 bg-gray-950/80">
                  Clique em Simular para gerar as trajetórias
                </div>
              )}
            </div>

            {/* Simulation statistics */}
            {mcResults && (
              <div className="bg-gray-950/40 rounded-2xl border border-gray-900 p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-semibold">Risco de Ruína (banca &lt; 10%):</span>
                  <span className={`font-black text-sm ${mcResults.ruinProbability > 0.05 ? "text-rose-400" : mcResults.ruinProbability > 0.01 ? "text-yellow-400" : "text-emerald-400"}`}>
                    {pct(mcResults.ruinProbability)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-semibold">Drawdown Máximo Médio:</span>
                  <span className="font-black text-white text-sm">{pct(mcResults.averageMaxDrawdown)}</span>
                </div>

                <div className="border-t border-gray-900/80 pt-3 space-y-2">
                  <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-wider mb-2">Projeções de Banca (Percentis)</h4>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cenário Otimista (90%):</span>
                    <span className="font-bold text-emerald-400">{toBRL(mcResults.percentile90)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cenário Mediano (50%):</span>
                    <span className="font-bold text-white">{toBRL(mcResults.percentile50)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cenário Pessimista (10%):</span>
                    <span className="font-bold text-rose-400">{toBRL(mcResults.percentile10)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bet History */}
      <div className="glass-panel rounded-3xl border border-gray-800 p-6 shadow-xl">
        <h2 className="text-lg font-black text-white mb-6 uppercase tracking-wider flex items-center gap-2">
          <span>🗒️</span> Histórico de Apostas e Auditoria
        </h2>

        {bets.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-12">Nenhuma aposta registrada até o momento. Faça suas simulações acima para preencher o histórico.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">Partida / Mercado</th>
                  <th className="pb-3">Seleção</th>
                  <th className="pb-3 text-right">Odd / EV</th>
                  <th className="pb-3 text-right">Kelly Stake</th>
                  <th className="pb-3 text-right">Apostado</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {bets.map(b => (
                  <tr key={b.id} className="hover:bg-gray-900/30">
                    <td className="py-4">
                      <div className="font-bold text-white">{b.homeTeamName} vs {b.awayTeamName}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{b.marketLabel}</div>
                    </td>
                    <td className="py-4 font-semibold text-gray-300">{b.selectionLabel}</td>
                    <td className="py-4 text-right">
                      <div className="font-bold text-white">{b.odd.toFixed(2)}</div>
                      <div className={`text-[10px] ${b.ev > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {b.ev > 0 ? "+" : ""}{(b.ev * 100).toFixed(1)}% EV
                      </div>
                    </td>
                    <td className="py-4 text-right text-gray-400 font-semibold">{toBRL(b.kellyStake)}</td>
                    <td className="py-4 text-right font-black text-white">{toBRL(b.stake)}</td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider
                        ${b.status === "WON" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-pulse"
                        : b.status === "LOST" ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                        : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"}`}
                      >
                        {b.status === "WON" ? "Ganha" : b.status === "LOST" ? "Perdida" : "Pendente"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleResolveBet(b.id, "WON")}
                              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 rounded font-bold cursor-pointer"
                              title="Marcar como Ganha"
                            >
                              ✓ Ganha
                            </button>
                            <button
                              onClick={() => handleResolveBet(b.id, "LOST")}
                              className="bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 px-2 py-1 rounded font-bold cursor-pointer"
                              title="Marcar como Perdida"
                            >
                              ✗ Perdida
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteBet(b.id)}
                          className="text-gray-500 hover:text-rose-400 px-2 py-1 rounded font-bold cursor-pointer"
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        <GoalCalculator currentBalance={balance} />
      )}

    </div>
  );
}
