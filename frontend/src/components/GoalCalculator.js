"use client";

import React, { useState } from "react";
import { calculateGoalMetrics } from "../utils/mathEngine";

// Format BRL
const toBRL = (val) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export default function GoalCalculator({ currentBalance }) {
  // --- Form State ---
  const [capitalInput, setCapitalInput] = useState(currentBalance ? String(currentBalance) : "1000");
  const [targetProfitInput, setTargetProfitInput] = useState("300");
  const [daysInput, setDaysInput] = useState("30");
  
  // Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [riskProfile, setRiskProfile] = useState("conservative"); // 'conservative' | 'moderate' | 'aggressive'
  const [betsPerDay, setBetsPerDay] = useState("1");
  const [calcMode, setCalcMode] = useState("fixed"); // 'fixed' | 'compound'

  // Sync with current bankroll balance if balance changes and is not manual edit
  const [prevBalance, setPrevBalance] = useState(currentBalance);
  if (currentBalance !== prevBalance) {
    setPrevBalance(currentBalance);
    if (currentBalance && currentBalance > 0) {
      setCapitalInput(String(currentBalance));
    }
  }

  // Calculate metrics on render (no useEffect needed)
  const results = calculateGoalMetrics({
    capital: parseFloat(capitalInput) || 0,
    targetProfit: parseFloat(targetProfitInput) || 0,
    days: parseInt(daysInput) || 0,
    riskProfile,
    betsPerDay: parseInt(betsPerDay) || 1,
    calcMode
  });

  return (
    <div className="glass-panel rounded-3xl border border-gray-800 p-6 shadow-xl relative overflow-hidden space-y-6">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
      
      <div>
        <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span>🎯</span> Calculadora de Metas (ProbEngine Lite)
        </h2>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Planeje sua meta de lucro de forma estatisticamente viável. Descubra a odd mínima necessária e o stake recomendado para não comprometer sua banca.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Inputs (Left) */}
        <div className="md:col-span-7 space-y-5">
          {/* Capital Available */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Capital Disponível (Banca)</label>
              <span className="text-xs text-gray-500">Saldo Atual: {toBRL(currentBalance)}</span>
            </div>
            <div className="flex gap-2">
              <input 
                type="number"
                value={capitalInput}
                onChange={(e) => setCapitalInput(e.target.value)}
                className="bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5 w-full text-sm font-black text-white focus:outline-none focus:border-violet-500"
                placeholder="Ex: 1000"
              />
              <button 
                onClick={() => setCapitalInput(String(currentBalance))}
                className="bg-gray-850 hover:bg-gray-800 text-[10px] font-black uppercase text-violet-400 border border-gray-800 px-3 py-2.5 rounded-xl transition-all cursor-pointer shrink-0"
              >
                Usar Saldo
              </button>
            </div>
          </div>

          {/* Target Profit & Days */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lucro Desejado (BRL)</label>
              <input 
                type="number"
                value={targetProfitInput}
                onChange={(e) => setTargetProfitInput(e.target.value)}
                className="bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5 w-full text-sm font-black text-white focus:outline-none focus:border-violet-500"
                placeholder="Ex: 300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Prazo (Dias)</label>
              <input 
                type="number"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5 w-full text-sm font-black text-white focus:outline-none focus:border-violet-500"
                placeholder="Ex: 30"
              />
            </div>
          </div>

          {/* Toggle Advanced */}
          <div className="pt-2">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 focus:outline-none select-none cursor-pointer"
            >
              <span>{showAdvanced ? "▼" : "▶"}</span> Configurações Avançadas
            </button>
          </div>

          {/* Advanced Section */}
          {showAdvanced && (
            <div className="glass-panel bg-gray-950/40 border border-gray-900 rounded-2xl p-5 space-y-4 animate-fade-in">
              
              {/* Risk Profile Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Perfil de Risco (Exposição)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "conservative", label: "Conservador (1%)" },
                    { key: "moderate", label: "Moderado (2%)" },
                    { key: "aggressive", label: "Agressivo (5%)" }
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => setRiskProfile(p.key)}
                      className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all duration-300 cursor-pointer border ${
                        riskProfile === p.key
                          ? "bg-violet-950/60 border-violet-500 text-violet-300"
                          : "bg-gray-900 border-gray-850 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculations Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bets Per Day */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Apostas por Dia</label>
                  <input 
                    type="number"
                    value={betsPerDay}
                    onChange={(e) => setBetsPerDay(e.target.value)}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 w-full text-xs font-bold text-white focus:outline-none focus:border-violet-500 text-center"
                    min="1"
                  />
                </div>

                {/* Calculation Mode */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Método de Cálculo</label>
                  <div className="grid grid-cols-2 gap-1 bg-gray-900 border border-gray-800 p-0.5 rounded-xl">
                    <button
                      onClick={() => setCalcMode("fixed")}
                      className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-300 cursor-pointer ${
                        calcMode === "fixed"
                          ? "bg-violet-600 text-white"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      Fixo (Linear)
                    </button>
                    <button
                      onClick={() => setCalcMode("compound")}
                      className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-300 cursor-pointer ${
                        calcMode === "compound"
                          ? "bg-violet-600 text-white"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      Composto
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Outputs & Recommendation (Right) */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-6">
          {results?.error ? (
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 text-center text-xs text-rose-400 flex flex-col justify-center h-full">
              <span>⚠️</span>
              <p className="mt-1 font-semibold">{results.error}</p>
            </div>
          ) : results ? (
            <div className="space-y-5 flex flex-col justify-between h-full">
              
              {/* Output Stats cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-3 text-center">
                  <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Stake Ideal</span>
                  <span className="text-xs font-black text-white block">{toBRL(results.stake)}</span>
                  <span className="text-[8px] font-semibold text-gray-500">{(results.riskPct * 100).toFixed(0)}% da Banca</span>
                </div>
                <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-3 text-center border-l-2 border-l-violet-500/40">
                  <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Odd Mínima</span>
                  <span className="text-sm font-black text-white block">{results.odd.toFixed(2)}</span>
                  <span className="text-[8px] font-semibold text-violet-400">Alvo Necessário</span>
                </div>
                <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-3 text-center">
                  <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Prob. Equilíbrio</span>
                  <span className="text-xs font-black text-white block">{(results.probEquilibrium * 100).toFixed(1)}%</span>
                  <span className="text-[8px] font-semibold text-gray-500">Ponto de EV=0</span>
                </div>
              </div>

              {/* Natural Language Summary */}
              <div className="bg-gray-950/40 border border-gray-900 rounded-2xl p-4 space-y-2">
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest block">Resumo do Planj.</span>
                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                  Com banca de <strong className="text-white">{toBRL(capitalInput)}</strong> e apostas de <strong className="text-white">{toBRL(results.stake)}</strong> ({calcMode === "fixed" ? "Lineares" : "Compostas"}), você precisará de lucro médio de <strong className="text-violet-400">{toBRL(results.profitPerBet)}</strong> por aposta.
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                  Para bater essa meta em <strong className="text-white">{daysInput} dias</strong> ({results.totalBets} apostas), busque odds a partir de <strong className="text-emerald-400">{results.odd.toFixed(2)}</strong>. Sua confiança no evento deve ser &gt; <strong className="text-white">{(results.probEquilibrium * 100).toFixed(0)}%</strong> para haver valor.
                </p>
              </div>

              {/* Guardrails / Feasibility Alerts */}
              <div className="space-y-2.5">
                {results.alerts.length === 0 ? (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-[10px] text-emerald-400 font-bold flex items-center gap-2">
                    <span>🛡️</span> Meta viável e segura. O plano respeita faixas conservadoras de gestão de banca.
                  </div>
                ) : (
                  results.alerts.map((a, idx) => {
                    const alertClasses = a.type === "danger" 
                      ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
                      : a.type === "warning"
                      ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                      : "bg-cyan-950/20 border-cyan-500/30 text-cyan-300";
                    return (
                      <div key={idx} className={`border rounded-xl p-3 text-[10px] leading-relaxed font-semibold flex gap-2 ${alertClasses}`}>
                        <span className="shrink-0">{a.type === "danger" ? "🚨" : a.type === "warning" ? "⚠️" : "ℹ️"}</span>
                        <span>{a.message}</span>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-6">Aguardando dados de entrada...</p>
          )}
        </div>

      </div>

      {/* Advanced formula auditing */}
      {showAdvanced && results && !results.error && (
        <div className="border-t border-gray-900/60 pt-4 text-[10px] text-gray-500 space-y-2">
          <span className="font-bold uppercase tracking-wider block text-gray-400">Memória de Cálculo (Auditoria)</span>
          {calcMode === "fixed" ? (
            <div className="font-mono bg-gray-950/30 border border-gray-900/60 p-3 rounded-xl space-y-1">
              <div>1. Stake por entrada = {toBRL(capitalInput)} × {(results.riskPct * 100).toFixed(0)}% = {toBRL(results.stake)}</div>
              <div>2. Total de apostas = {daysInput} dias × {betsPerDay} por dia = {results.totalBets}</div>
              <div>3. Lucro por aposta = {toBRL(targetProfitInput)} / {results.totalBets} = {toBRL(results.profitPerBet)}</div>
              <div>4. Odd Mínima = 1 + ({toBRL(results.profitPerBet)} / {toBRL(results.stake)}) = {results.odd.toFixed(2)}</div>
              <div>5. Ponto de Equilíbrio = 1 / {results.odd.toFixed(2)} = {(results.probEquilibrium * 100).toFixed(1)}%</div>
            </div>
          ) : (
            <div className="font-mono bg-gray-950/30 border border-gray-900/60 p-3 rounded-xl space-y-1">
              <div>1. Banca Alvo = {toBRL(capitalInput)} + {toBRL(targetProfitInput)} = {toBRL(parseFloat(capitalInput) + parseFloat(targetProfitInput))}</div>
              <div>2. Total de apostas = {daysInput} dias × {betsPerDay} por dia = {results.totalBets}</div>
              <div>3. Fator de Crescimento Exponencial por Aposta = ({toBRL(parseFloat(capitalInput) + parseFloat(targetProfitInput))} / {toBRL(capitalInput)}) ^ (1 / {results.totalBets}) = {(Math.pow((parseFloat(capitalInput) + parseFloat(targetProfitInput)) / parseFloat(capitalInput), 1 / results.totalBets)).toFixed(6)}</div>
              <div>4. Odd Mínima = 1 + (fator - 1) / {(results.riskPct * 100).toFixed(0)}% = {results.odd.toFixed(2)}</div>
              <div>5. Ponto de Equilíbrio = 1 / {results.odd.toFixed(2)} = {(results.probEquilibrium * 100).toFixed(1)}%</div>
              <div className="text-[9px] text-amber-500 font-sans font-semibold mt-1">⚠️ Nota: Este modo assume crescimento contínuo sem derrotas consecutivas. Monitore drawdowns.</div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
