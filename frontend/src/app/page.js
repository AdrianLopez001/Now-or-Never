"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── helpers ────────────────────────────────────────────────────────────────
const toOdd  = (p) => p > 0 ? (1 / p).toFixed(2) : "—";
const pct    = (p) => `${(p * 100).toFixed(0)}%`;
const isHot  = (pred) =>
  pred && (pred.probHomeWin > 0.65 || pred.probBttsYes > 0.65 || pred.probOver25 > 0.70);

function useCountdown(matchDate) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(matchDate) - Date.now();
      if (diff <= 0) { setLabel("AO VIVO / ENCERRADO"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (h > 48) {
        const d = Math.floor(h / 24);
        setLabel(`Em ${d}d ${h % 24}h`);
      } else {
        setLabel(`Em ${h}h ${m}min`);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [matchDate]);
  return label;
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ msg, type = "success", onDone }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setLeaving(true); setTimeout(onDone, 300); }, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-300"
           : "bg-red-900/90 border-red-500/40 text-red-300";
  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border px-5 py-3.5 shadow-2xl text-sm font-semibold
      backdrop-blur-md ${bg} ${leaving ? "toast-out" : "toast-in"}`}>
      {type === "success" ? "✅ " : "❌ "}{msg}
    </div>
  );
}

// ─── Market Row (card) ───────────────────────────────────────────────────────
function MarketRow({ label, yes, yesLabel = "Sim", no, noLabel = "Não", color = "emerald" }) {
  const colors = {
    emerald: { bar: "bg-emerald-500", text: "text-emerald-400", chip: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
    sky:     { bar: "bg-sky-500",     text: "text-sky-400",     chip: "bg-sky-500/10 border-sky-500/20 text-sky-400" },
    amber:   { bar: "bg-amber-500",   text: "text-amber-400",   chip: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    rose:    { bar: "bg-rose-500",    text: "text-rose-400",    chip: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
  };
  const c = colors[color] || colors.emerald;
  return (
    <div className="market-row">
      <span className="text-[10px] font-semibold text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 mx-3 h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${yes * 100}%` }} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-black ${c.text}`}>{pct(yes)}</span>
        <span className="odd-chip">{toOdd(yes)}</span>
      </div>
    </div>
  );
}

// ─── Match Card ──────────────────────────────────────────────────────────────
function MatchCard({ match, pred }) {
  const countdown = useCountdown(match.matchDate);
  const hot = isHot(pred);

  return (
    <div className={`glass-panel glass-panel-hover flex flex-col rounded-2xl overflow-hidden transition-all duration-300
      ${hot ? "border border-red-500/30" : ""}`}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-900 border border-gray-800 rounded px-2 py-0.5">
          {match.matchRound}
        </span>
        <div className="flex items-center gap-2">
          {hot && (
            <span className="badge-hot text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/30 rounded-full px-2 py-0.5 uppercase tracking-wider">
              🔥 Jogo Quente
            </span>
          )}
          <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded px-2 py-0.5">
            ⏱ {countdown}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex flex-col items-center gap-2 flex-1">
          <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="h-14 w-14 object-contain drop-shadow-md" />
          <span className="text-sm font-black text-white text-center leading-tight">{match.homeTeam.name}</span>
        </div>

        <div className="flex flex-col items-center gap-1 px-3">
          {match.status === "FINISHED" ? (
            <div className="flex items-center gap-2 text-2xl font-black text-white bg-gray-900/80 border border-gray-800 px-3 py-1.5 rounded-xl">
              <span>{match.scoreHome}</span>
              <span className="text-gray-600 text-sm font-normal">FT</span>
              <span>{match.scoreAway}</span>
            </div>
          ) : (
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-400 uppercase tracking-widest border border-violet-500/20">
              VS
            </span>
          )}
          <span className="text-[9px] text-gray-600 font-medium mt-1">
            {new Date(match.matchDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            {" · "}
            {new Date(match.matchDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 flex-1">
          <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="h-14 w-14 object-contain drop-shadow-md" />
          <span className="text-sm font-black text-white text-center leading-tight">{match.awayTeam.name}</span>
        </div>
      </div>

      {/* Markets */}
      {pred ? (
        <div className="px-5 pb-4 space-y-1">
          {/* 1x2 bar */}
          <div className="flex items-stretch gap-1 rounded-xl overflow-hidden mb-3 text-[10px] font-black">
            <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/15 rounded-l-xl flex-1 py-2 gap-0.5">
              <span className="text-gray-500 font-semibold">Casa</span>
              <span className="text-emerald-300">{pct(pred.probHomeWin)}</span>
              <span className="odd-chip">{toOdd(pred.probHomeWin)}</span>
            </div>
            <div className="flex flex-col items-center bg-gray-800/40 border-y border-gray-700/30 flex-1 py-2 gap-0.5">
              <span className="text-gray-500 font-semibold">Empate</span>
              <span className="text-gray-300">{pct(pred.probDraw)}</span>
              <span className="odd-chip">{toOdd(pred.probDraw)}</span>
            </div>
            <div className="flex flex-col items-center bg-sky-500/10 border border-sky-500/15 rounded-r-xl flex-1 py-2 gap-0.5">
              <span className="text-gray-500 font-semibold">Fora</span>
              <span className="text-sky-300">{pct(pred.probAwayWin)}</span>
              <span className="odd-chip">{toOdd(pred.probAwayWin)}</span>
            </div>
          </div>

          {/* Sub-markets */}
          <div className="rounded-xl bg-gray-900/40 border border-gray-800/60 px-3 py-2 space-y-0.5">
            <MarketRow label="BTTS (Ambos Marcam)" yes={pred.probBttsYes} yesLabel="Sim" color="emerald" />
            <MarketRow label="Over 2.5 Gols"       yes={pred.probOver25}  yesLabel="Sim" color="sky" />
            <MarketRow label="Over 9.5 Escanteios" yes={pred.probOver95Corners} yesLabel="Sim" color="amber" />
            <MarketRow label="Over 4.5 Cartões"    yes={pred.probOver45Cards}   yesLabel="Sim" color="rose" />
          </div>

          {/* Chance dupla mini */}
          <div className="flex gap-1 mt-1 text-[9px] font-bold text-center">
            {[
              { l: "1X", v: pred.probDoubleChance1X },
              { l: "12", v: pred.probDoubleChance12 },
              { l: "X2", v: pred.probDoubleChanceX2 },
            ].map(({ l, v }) => (
              <div key={l} className="flex-1 rounded-lg bg-gray-900/50 border border-gray-800 py-1.5">
                <div className="text-gray-500">{l}</div>
                <div className="text-gray-200 font-black text-[10px]">{pct(v)}</div>
                <div className="odd-chip mx-auto mt-0.5" style={{ width: "fit-content" }}>{toOdd(v)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="h-10 flex items-center justify-center text-xs text-gray-600 bg-gray-900/40 rounded-xl">
            Calculando probabilidades...
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-5 pb-5 mt-auto">
        <Link
          href={`/match/${match.id}`}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/25 py-3 text-xs font-black text-violet-300 hover:from-violet-600/35 hover:to-indigo-600/35 hover:text-violet-200 transition-all duration-300 uppercase tracking-widest"
        >
          📊 Análise Completa & Multi-IA →
        </Link>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [matches,      setMatches]      = useState([]);
  const [predictions,  setPredictions]  = useState({});
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [silentSyncing,setSilentSyncing]= useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const loadData = useCallback((savedUserId) => {
    return fetch("http://localhost:8080/api/matches")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((matchesData) => {
        setMatches(matchesData);
        const promises = matchesData.map((m) => {
          const url = savedUserId
            ? `http://localhost:8080/api/predictions/match/${m.id}?userId=${savedUserId}`
            : `http://localhost:8080/api/predictions/match/${m.id}`;
          return fetch(url)
            .then((res) => (res.ok ? res.json() : null))
            .then((pred) => ({ matchId: m.id, pred }))
            .catch(() => ({ matchId: m.id, pred: null }));
        });
        return Promise.all(promises);
      })
      .then((predsList) => {
        const predsMap = {};
        predsList.forEach(({ matchId, pred }) => { if (pred) predsMap[matchId] = pred; });
        setPredictions(predsMap);
      });
    // Nota: sem .catch() aqui — deixamos o erro propagar para o chamador
  }, []);

  useEffect(() => {
    const savedUserId = localStorage.getItem("now_or_never_user_id");
    loadData(savedUserId)
      .then(() => {
        setLoading(false);
        // Silent background refresh — fire-and-forget para não bloquear a UI.
        // O script Python pode levar minutos; a página carrega imediatamente
        // com os dados atuais e se auto-atualiza quando o backend terminar.
        setSilentSyncing(true);
        fetch("http://localhost:8080/api/matches/refresh", { method: "POST" })
          .then((res) => { if (res.ok) return loadData(savedUserId); })
          .catch((err) => console.warn("Silent sync error (non-blocking):", err))
          .finally(() => setSilentSyncing(false));
      })
      .catch((err) => {
        console.error("Erro ao carregar dados do backend:", err);
        setLoading(false);
      });
  }, [loadData]);


  const handleRefresh = () => {
    setRefreshing(true);
    const savedUserId = localStorage.getItem("now_or_never_user_id");
    fetch("http://localhost:8080/api/matches/refresh", { method: "POST" })
      .then((res) => { if (!res.ok) throw new Error("Falha no servidor"); return res.json(); })
      .then(() => loadData(savedUserId))
      .then(() => showToast("Dados e probabilidades atualizados em tempo real! ⚡"))
      .catch((err) => showToast("Erro ao sincronizar: " + err.message, "error"))
      .finally(() => setRefreshing(false));
  };

  // ─── Bolão Recommendation ─────────────────────────────────────────────────
  const getBolao = () => {
    const matchPreds = matches
      .map((m) => ({ match: m, pred: predictions[m.id] }))
      .filter((mp) => mp.pred);
    if (!matchPreds.length) return null;

    const selections = [];
    matchPreds.forEach(({ match, pred }) => {
      if      (pred.probHomeWin       > 0.60) selections.push({ match, desc: `Vitória do ${match.homeTeam.name}`,        prob: pred.probHomeWin,       odd: toOdd(pred.probHomeWin) });
      else if (pred.probAwayWin       > 0.60) selections.push({ match, desc: `Vitória do ${match.awayTeam.name}`,        prob: pred.probAwayWin,       odd: toOdd(pred.probAwayWin) });
      else if (pred.probDraw          > 0.60) selections.push({ match, desc: `Empate`,                                    prob: pred.probDraw,          odd: toOdd(pred.probDraw) });
      else if (pred.probDoubleChance1X > 0.60 && pred.probDoubleChance1X > pred.probDoubleChanceX2)
                                              selections.push({ match, desc: `${match.homeTeam.name} ou Empate (1X)`,    prob: pred.probDoubleChance1X, odd: toOdd(pred.probDoubleChance1X) });
      else if (pred.probDoubleChanceX2 > 0.60) selections.push({ match, desc: `${match.awayTeam.name} ou Empate (X2)`, prob: pred.probDoubleChanceX2, odd: toOdd(pred.probDoubleChanceX2) });
    });
    if (!selections.length) return null;
    const combinedProb = selections.reduce((acc, s) => acc * s.prob, 1.0);
    return { selections, combinedProb, combinedOdd: toOdd(combinedProb) };
  };

  const bolao = getBolao();

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <p className="text-sm font-semibold text-gray-400">Carregando partidas e análises preditivas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            🌍 Copa do Mundo FIFA 2026
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Análise preditiva por 3 modelos de IA — probabilidades e odds para todos os mercados de aposta
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || silentSyncing}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600/20 border border-violet-500/30 px-4 py-2.5 text-xs font-black text-violet-300 hover:bg-violet-600/30 transition-all duration-300 disabled:opacity-50 uppercase tracking-wider shrink-0"
        >
          <svg className={`h-3.5 w-3.5 ${refreshing || silentSyncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 20v-5h-.581m-15.356-2a8.001 8.001 0 11-15.828 2.11" />
          </svg>
          {refreshing || silentSyncing ? "Atualizando..." : "Sincronizar ⚡"}
        </button>
      </div>

      {/* Bolão Recommendation */}
      {bolao && (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-gray-200 uppercase tracking-wider border-l-4 border-emerald-500 pl-3">
            🏆 Recomendação de Bolão Inteligente (IA) — Eventos &gt; 60%
          </h2>
          <div className="glass-panel rounded-2xl border border-emerald-500/20 bg-[#0a1a10]/40 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Selections list */}
              <div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-3">
                  🎟️ Bilhete — {bolao.selections.length} seleção(ões) confirmadas
                </p>
                <ul className="space-y-2.5">
                  {bolao.selections.map((sel, idx) => (
                    <li key={idx} className="flex items-center justify-between text-xs border-b border-gray-800/40 pb-2">
                      <div>
                        <span className="text-gray-200 font-bold block">
                          {sel.match.homeTeam.name} vs {sel.match.awayTeam.name}
                        </span>
                        <span className="text-gray-400">{sel.desc}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {pct(sel.prob)}
                        </span>
                        <span className="odd-chip">{sel.odd}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Summary */}
              <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-6">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Resumo do Bolão</h4>
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    Bilhete montado reunindo os eventos com probabilidade superior a 60% nos mercados de resultado final e chance dupla, maximizando a taxa de acerto estatístico.
                  </p>
                </div>
                <div className="border-t border-gray-800/80 pt-4 mt-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">Odd Acumulada</span>
                    <span className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{bolao.combinedOdd}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">Prob. Combinada</span>
                    <span className="text-lg font-black text-emerald-400">{pct(bolao.combinedProb)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match grid */}
      <div>
        <h2 className="text-sm font-black text-gray-200 uppercase tracking-wider border-l-4 border-violet-500 pl-3 mb-6 flex items-center gap-3">
          Partidas Confirmadas
          {silentSyncing && (
            <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-0.5 animate-pulse">
              🔄 Sincronizando...
            </span>
          )}
        </h2>

        {matches.length === 0 ? (
          <div className="rounded-xl border border-gray-900 bg-gray-950/40 p-8 text-center text-gray-500 text-sm">
            Nenhuma partida carregada. Verifique se o backend está ativo em{" "}
            <code className="text-violet-400">localhost:8080</code>.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} pred={predictions[match.id]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
