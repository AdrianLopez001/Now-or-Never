"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";

const toOdd = (p) => p > 0 ? (1 / p).toFixed(2) : "—";
const pct   = (p) => `${(p * 100).toFixed(0)}%`;

export default function MatchDetail({ params }) {
  // Next.js 15 unwrapping params
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const [match, setMatch] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUserId = localStorage.getItem("now_or_never_user_id");
    
    // Fetch match details
    fetch(`/api/matches/${matchId}`)
      .then((res) => res.json())
      .then((matchData) => {
        setMatch(matchData);
        
        // Fetch predictions
        const url = savedUserId 
          ? `/api/predictions/match/${matchId}?userId=${savedUserId}`
          : `/api/predictions/match/${matchId}`;
        return fetch(url);
      })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((predData) => {
        setPrediction(predData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
        <p className="text-sm font-semibold text-gray-400">Carregando inteligência preditiva...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center p-12 rounded-2xl border border-gray-800 bg-gray-950/20">
        Partida não encontrada.
      </div>
    );
  }

  // Parse SHAP values and natural explanations if unlocked
  const isLocked = false;
  
  let shapHome = {};
  let explanations = {};
  
  if (!isLocked && prediction) {
    try {
      const shapRaw = JSON.parse(prediction.shapValuesJson);
      shapHome = shapRaw.home_win || {};
      explanations = JSON.parse(prediction.explanationsJson) || {};
    } catch (e) {
      console.error("Failed to parse prediction JSON strings", e);
    }
  }

  // Display translation mapping for features
  const featureTranslations = {
    "home_form": "Forma Recente (Mandante)",
    "away_form": "Forma Recente (Visitante)",
    "h2h_home_wins": "Histórico Confronto Direto",
    "home_injury_index": "Nível de Desfalques (Mandante)",
    "away_injury_index": "Nível de Desfalques (Visitante)",
    "rest_days_diff": "Diferença Dias Descanso",
    "xg_home_avg": "Média Gols Esperados (xG) Mandante",
    "xg_away_avg": "Média Gols Esperados (xG) Visitante"
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header match title card */}
      <div className="rounded-2xl border border-gray-800 bg-[#111827]/40 px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Home team */}
          <div className="flex items-center gap-4 flex-1 justify-end sm:justify-start">
            <span className="text-lg font-black text-white text-right hidden sm:inline">{match.homeTeam.name}</span>
            <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="h-16 w-16 object-contain" />
            <span className="text-lg font-black text-white sm:hidden">{match.homeTeam.name}</span>
          </div>
          
          {/* Middle VS info */}
          <div className="text-center px-4">
            {match.status === "FINISHED" ? (
              <div className="flex items-center gap-3 justify-center mb-1">
                <span className="text-4xl font-extrabold text-white">{match.scoreHome}</span>
                <span className="text-gray-500 font-bold text-lg">-</span>
                <span className="text-4xl font-extrabold text-white">{match.scoreAway}</span>
              </div>
            ) : (
              <div className="rounded-full bg-violet-500/10 px-4 py-1.5 border border-violet-500/20 text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">
                Não Iniciada
              </div>
            )}
            <span className="text-xs text-gray-500 block">{match.matchRound} • 2026</span>
          </div>

          {/* Away team */}
          <div className="flex items-center gap-4 flex-1">
            <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="h-16 w-16 object-contain" />
            <span className="text-lg font-black text-white">{match.awayTeam.name}</span>
          </div>

        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Outcome probabilities dial card */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">
              Probabilidades Finais da Partida
            </h3>
            
            {prediction ? (
              <div className="space-y-6">
                {/* SVG Outcome Bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-emerald-400">Casa {pct(prediction.probHomeWin)}</span>
                      <span className="odd-chip">{toOdd(prediction.probHomeWin)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-gray-400">Empate {pct(prediction.probDraw)}</span>
                      <span className="odd-chip">{toOdd(prediction.probDraw)}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-sky-400">Fora {pct(prediction.probAwayWin)}</span>
                      <span className="odd-chip">{toOdd(prediction.probAwayWin)}</span>
                    </div>
                  </div>
                  <div className="h-4 w-full rounded-full overflow-hidden bg-gray-800 flex">
                    <div style={{ width: `${prediction.probHomeWin*100}%` }} className="bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
                    <div style={{ width: `${prediction.probDraw*100}%` }} className="bg-gray-600"></div>
                    <div style={{ width: `${prediction.probAwayWin*100}%` }} className="bg-gradient-to-r from-sky-500 to-indigo-500"></div>
                  </div>
                </div>

                {/* Sub-markets */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {/* BTTS */}
                  <div className="relative rounded-xl border border-gray-800/80 bg-gray-900/30 p-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Ambos Marcam (BTTS)</span>
                    {isLocked ? (
                      <div className="flex flex-col items-center justify-center h-12">
                        <span className="text-xs text-gray-500 font-semibold blur-[1.5px]">Sim: 65% / Não: 35%</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center h-12">
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">SIM</span>
                          <span className="text-lg font-black text-white">{pct(prediction.probBttsYes)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probBttsYes)}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-gray-800"></div>
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">NÃO</span>
                          <span className="text-lg font-black text-white">{pct(prediction.probBttsNo)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probBttsNo)}</span>
                        </div>
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-950/80 backdrop-blur-[2px] border border-violet-500/10">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                          🔒 Premium
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Over Under 2.5 */}
                  <div className="relative rounded-xl border border-gray-800/80 bg-gray-900/30 p-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Total de Gols</span>
                    {isLocked ? (
                      <div className="flex flex-col items-center justify-center h-12">
                        <span className="text-xs text-gray-500 font-semibold blur-[1.5px]">Over: 52% / Under: 48%</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center h-12">
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">Over 2.5</span>
                          <span className="text-lg font-black text-white">{pct(prediction.probOver25)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probOver25)}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-gray-800"></div>
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">Under 2.5</span>
                          <span className="text-lg font-black text-white">{pct(prediction.probUnder25)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probUnder25)}</span>
                        </div>
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-950/80 backdrop-blur-[2px] border border-violet-500/10">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                          🔒 Premium
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chance Dupla */}
                  <div className="relative rounded-xl border border-gray-800/80 bg-gray-900/30 p-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Chance Dupla</span>
                    {isLocked ? (
                      <div className="flex flex-col items-center justify-center h-12">
                        <span className="text-xs text-gray-500 font-semibold blur-[1.5px]">1X: 80% / 12: 85% / X2: 45%</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center h-12">
                        <div className="text-center flex-1">
                          <span className="text-[9px] text-gray-400 block font-medium">1X</span>
                          <span className="text-sm font-black text-white">{pct(prediction.probDoubleChance1X)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probDoubleChance1X)}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-gray-800"></div>
                        <div className="text-center flex-1">
                          <span className="text-[9px] text-gray-400 block font-medium">12</span>
                          <span className="text-sm font-black text-white">{pct(prediction.probDoubleChance12)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probDoubleChance12)}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-gray-800"></div>
                        <div className="text-center flex-1">
                          <span className="text-[9px] text-gray-400 block font-medium">X2</span>
                          <span className="text-sm font-black text-white">{pct(prediction.probDoubleChanceX2)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probDoubleChanceX2)}</span>
                        </div>
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-950/80 backdrop-blur-[2px] border border-violet-500/10">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                          🔒 Premium
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Gols Estendidos (Over 0.5 e Under 3.5) */}
                  <div className="relative rounded-xl border border-gray-800/80 bg-gray-900/30 p-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Gols Estendidos</span>
                    {isLocked ? (
                      <div className="flex flex-col items-center justify-center h-12">
                        <span className="text-xs text-gray-500 font-semibold blur-[1.5px]">&gt; 0.5: 95% / &lt; 3.5: 80%</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center h-12">
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">Over 0.5</span>
                          <span className="text-sm font-black text-white">{pct(prediction.probOver05)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probOver05)}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-gray-800"></div>
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">Under 3.5</span>
                          <span className="text-sm font-black text-white">{pct(prediction.probUnder35)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probUnder35)}</span>
                        </div>
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-950/80 backdrop-blur-[2px] border border-violet-500/10">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                          🔒 Premium
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Escanteios (Over 9.5) */}
                  <div className="relative rounded-xl border border-gray-800/80 bg-gray-900/30 p-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Escanteios (Over 9.5)</span>
                    {isLocked ? (
                      <div className="flex flex-col items-center justify-center h-12">
                        <span className="text-xs text-gray-500 font-semibold blur-[1.5px]">Mais de 9.5: 58%</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center h-12">
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">Over 9.5</span>
                          <span className="text-sm font-black text-white">{pct(prediction.probOver95Corners)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probOver95Corners)}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-gray-800"></div>
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">Under 9.5</span>
                          <span className="text-sm font-black text-white">{pct(1 - prediction.probOver95Corners)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(1 - prediction.probOver95Corners)}</span>
                        </div>
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-950/80 backdrop-blur-[2px] border border-violet-500/10">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                          🔒 Premium
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cartões (Over 4.5) */}
                  <div className="relative rounded-xl border border-gray-800/80 bg-gray-900/30 p-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Cartões Totais (Over 4.5)</span>
                    {isLocked ? (
                      <div className="flex flex-col items-center justify-center h-12">
                        <span className="text-xs text-gray-500 font-semibold blur-[1.5px]">Mais de 4.5: 64%</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center h-12">
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">Over 4.5</span>
                          <span className="text-sm font-black text-white">{pct(prediction.probOver45Cards)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(prediction.probOver45Cards)}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-gray-800"></div>
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-gray-400 block font-medium">Under 4.5</span>
                          <span className="text-sm font-black text-white">{pct(1 - prediction.probOver45Cards)}</span>
                          <span className="odd-chip mx-auto mt-0.5">{toOdd(1 - prediction.probOver45Cards)}</span>
                        </div>
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-950/80 backdrop-blur-[2px] border border-violet-500/10">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                          🔒 Premium
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center">Nenhuma previsão carregada para esta partida.</p>
            )}
          </div>
          <div className="mt-6 border-t border-gray-800/50 pt-4 flex justify-between text-[11px] text-gray-500">
            <span>Consenso: Random Forest · Regressão Logística · Gradient Boosting</span>
            <span>Atualizado: {prediction ? new Date(prediction.updatedAt).toLocaleString("pt-BR") : "N/A"}</span>
          </div>
        </div>

        {/* Brier validation score preview */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              Calibração do Modelo
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Em modelos de IA, a acurácia é medida pela calibração (Brier Score) em vez de acertos binários simples. Quanto mais próximo de 0.00, melhor calibradas são as probabilidades.
            </p>

            {prediction && prediction.brierScoreOutcome !== null ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Brier Score (Resultado)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-emerald-400">{prediction.brierScoreOutcome.toFixed(4)}</span>
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">EXCELENTE</span>
                  </div>
                </div>
                
                <div className="text-[10px] text-gray-500 leading-normal">
                  Este Brier Score é calculado em backtesting com dados históricos reais das últimas temporadas.
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4 text-center">
                <span className="text-xs text-gray-600 block">Sem métricas calculadas</span>
                <span className="text-[10px] text-gray-500 block mt-1">Apenas partidas concluídas (FINISHED) exibem Brier Scores reais calculados sobre o resultado real.</span>
              </div>
            )}
          </div>

          <Link href="/calibration" className="text-xs font-bold text-violet-400 hover:text-violet-300 mt-6 inline-block">
            Entender calibração & acurácia →
          </Link>
        </div>
      </div>

      {/* SHAP Explanability Section (Gate Restricted) */}
      <div className="glass-panel rounded-2xl p-6 relative">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">
          Gráfico SHAP — Importância de Características na Vitória do Mandante
        </h3>
        
        {/* SHAP graph plot */}
        <div className={`space-y-4 ${isLocked ? "blur-md pointer-events-none select-none opacity-40" : ""}`}>
          <div className="text-xs text-gray-400 mb-6">
            O gráfico abaixo indica quanto cada variável estatística adicionou (+) ou subtraiu (-) do valor base para definir a probabilidade estimada de vitória do mandante.
          </div>

          {/* Draw bar graphs inside custom Flex/grid layout using clean Tailwind components */}
          {Object.keys(shapHome).length > 0 ? (
            Object.entries(shapHome).map(([key, val]) => {
              const label = featureTranslations[key] || key;
              const absVal = Math.abs(val);
              const isPositive = val >= 0;
              // Normalize width based on max expected shap value of 0.15 (15%)
              const percentageWidth = Math.min(100, (absVal / 0.15) * 100);
              
              return (
                <div key={key} className="flex items-center text-xs gap-4">
                  {/* Label */}
                  <div className="w-1/3 text-right font-medium text-gray-300 truncate">
                    {label}
                  </div>
                  
                  {/* Axis & Bars */}
                  <div className="w-2/3 flex items-center relative h-6 bg-gray-900 border-l border-r border-gray-800">
                    {/* Central 0-line axis marker */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gray-700 z-10"></div>
                    
                    {isPositive ? (
                      <div className="absolute left-1/2 right-0 flex items-center">
                        <div 
                          style={{ width: `${percentageWidth/2}%` }}
                          className="h-4 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r"
                        ></div>
                        <span className="text-[10px] font-extrabold text-emerald-400 ml-2">+{ (val*100).toFixed(1) }%</span>
                      </div>
                    ) : (
                      <div className="absolute right-1/2 left-0 flex items-center justify-end">
                        <span className="text-[10px] font-extrabold text-rose-400 mr-2">-{ (absVal*100).toFixed(1) }%</span>
                        <div 
                          style={{ width: `${percentageWidth/2}%` }}
                          className="h-4 bg-gradient-to-l from-rose-500 to-rose-400 rounded-l"
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-gray-500">
              Gráfico SHAP indisponível.
            </div>
          )}
        </div>

        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gray-950/80 p-6 text-center z-20">
            <span className="text-3xl mb-3">🔒</span>
            <h4 className="text-base font-black text-white">Gráfico SHAP restrito ao plano Premium</h4>
            <p className="text-xs text-gray-400 max-w-sm mt-1 mb-6 leading-relaxed">
              O acesso aos pesos das variáveis matemáticas que geraram as previsões é exclusivo para assinantes.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-3 text-xs font-bold text-white uppercase tracking-wider hover:opacity-90 shadow-lg shadow-violet-500/20"
            >
              ← Voltar às Partidas
            </Link>
          </div>
        )}
      </div>

      {/* AI Analytical Insights Section */}
      <div className="glass-panel rounded-2xl p-6 relative">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">
          Relatório de Explicabilidade Preditiva
        </h3>

        {isLocked ? (
          <div className="space-y-4 blur-sm opacity-30 select-none">
            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            <div className="h-4 bg-gray-800 rounded w-2/3"></div>
          </div>
        ) : (
          <div className="space-y-6 text-sm">
            {/* Outcome narrative */}
            {explanations.outcome_summary && (
              <div className="border-b border-gray-800/60 pb-4">
                <span className="text-[10px] font-bold text-violet-400 block uppercase tracking-wider mb-1.5">Resultado da Partida</span>
                <p className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: explanations.outcome_summary }} />
              </div>
            )}

            {/* BTTS narrative */}
            {explanations.btts_summary && (
              <div className="border-b border-gray-800/60 pb-4">
                <span className="text-[10px] font-bold text-violet-400 block uppercase tracking-wider mb-1.5">Análise Ambos Marcam (BTTS)</span>
                <p className="text-gray-300 leading-relaxed">{explanations.btts_summary}</p>
              </div>
            )}

            {/* Goals narrative */}
            {explanations.goals_summary && (
              <div className="border-b border-gray-800/60 pb-4">
                <span className="text-[10px] font-bold text-violet-400 block uppercase tracking-wider mb-1.5">Gols & Over/Under</span>
                <p className="text-gray-300 leading-relaxed">{explanations.goals_summary}</p>
              </div>
            )}

            {/* Corners narrative */}
            {explanations.corners_summary && (
              <div className="border-b border-gray-800/60 pb-4">
                <span className="text-[10px] font-bold text-violet-400 block uppercase tracking-wider mb-1.5">Análise de Escanteios</span>
                <p className="text-gray-300 leading-relaxed">{explanations.corners_summary}</p>
              </div>
            )}

            {/* Cards narrative */}
            {explanations.cards_summary && (
              <div>
                <span className="text-[10px] font-bold text-violet-400 block uppercase tracking-wider mb-1.5">Análise de Disciplina (Cartões)</span>
                <p className="text-gray-300 leading-relaxed">{explanations.cards_summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Lock Overlay for report */}
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gray-950/80 p-6 text-center z-20">
            <span className="text-3xl mb-3">📝</span>
            <h4 className="text-base font-black text-white">Relatório Analítico Bloqueado</h4>
            <p className="text-xs text-gray-400 max-w-sm mt-1 mb-6 leading-relaxed">
              O relatório explicativo detalhado em linguagem natural sobre o comportamento do modelo é restrito.
            </p>
            <Link 
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-3 text-xs font-bold text-white uppercase tracking-wider hover:opacity-90 shadow-lg shadow-violet-500/20"
            >
              Liberar Relatórios Premium
            </Link>
          </div>
        )}
      </div>

      {/* Multi-AI Consensus Verification Section */}
      {explanations.consensus && (
        <div className="glass-panel rounded-2xl p-6 mt-8 relative border border-emerald-500/20 bg-[#0c1221]/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                🤖 Validação e Consenso Multi-IA
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Cruzamento de dados preditivos por três arquiteturas de inteligência artificial independentes.
              </p>
            </div>
            
            {/* Consensus Badge */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Selo de Consenso:</span>
              <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                explanations.consensus.confidence === "ALTA"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : explanations.consensus.confidence === "MODERADA"
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
                {explanations.consensus.confidence} CONFIANÇA
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Model A: Random Forest */}
            <div className="rounded-xl border border-gray-800 bg-[#060913]/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Model 1: Random Forest</span>
                <span className="text-[9px] bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold px-1.5 py-0.5 rounded uppercase">Principal</span>
              </div>
              <div className="space-y-2.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Vitória {match.homeTeam.name}:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.rf.home * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Empate:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.rf.draw * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Vitória {match.awayTeam.name}:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.rf.away * 100)}%</span>
                </div>
                <div className="border-t border-gray-800/60 pt-2.5 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Ambos Marcam:</span>
                    <span className="font-semibold">{Math.round(explanations.consensus.models.rf.btts_yes * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Over 2.5 Gols:</span>
                    <span className="font-semibold">{Math.round(explanations.consensus.models.rf.over25 * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Model B: Logistic Regression */}
            <div className="rounded-xl border border-gray-800 bg-[#060913]/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Model 2: Regressão Logística</span>
                <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-1.5 py-0.5 rounded uppercase">Validador A</span>
              </div>
              <div className="space-y-2.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Vitória {match.homeTeam.name}:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.lr.home * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Empate:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.lr.draw * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Vitória {match.awayTeam.name}:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.lr.away * 100)}%</span>
                </div>
                <div className="border-t border-gray-800/60 pt-2.5 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Ambos Marcam:</span>
                    <span className="font-semibold">{Math.round(explanations.consensus.models.lr.btts_yes * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Over 2.5 Gols:</span>
                    <span className="font-semibold">{Math.round(explanations.consensus.models.lr.over25 * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Model C: Gradient Boosting */}
            <div className="rounded-xl border border-gray-800 bg-[#060913]/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Model 3: Gradient Boosting</span>
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase">Validador B</span>
              </div>
              <div className="space-y-2.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Vitória {match.homeTeam.name}:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.gb.home * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Empate:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.gb.draw * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Vitória {match.awayTeam.name}:</span>
                  <span className="font-semibold text-gray-100">{Math.round(explanations.consensus.models.gb.away * 100)}%</span>
                </div>
                <div className="border-t border-gray-800/60 pt-2.5 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Ambos Marcam:</span>
                    <span className="font-semibold">{Math.round(explanations.consensus.models.gb.btts_yes * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">Over 2.5 Gols:</span>
                    <span className="font-semibold">{Math.round(explanations.consensus.models.gb.over25 * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-800/60 pt-3 text-[11px] text-gray-400 leading-relaxed italic">
            💡 **Metodologia de Autenticação**: O percentual final apresentado no painel de jogos representa o consenso matemático ponderado das três redes neurais/classificadores. O desvio padrão atual é de {(explanations.consensus.mean_deviation * 100).toFixed(1)}%, certificando a consistência dos dados preditivos.
          </div>
        </div>
      )}
    </div>
  );
}
