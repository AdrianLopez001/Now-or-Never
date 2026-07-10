"use client";

import React, { useState, useEffect } from "react";

export default function Pricing() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchUsers = () => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        const savedUserId = localStorage.getItem("now_or_never_user_id");
        if (savedUserId) {
          const found = data.find((u) => u.id === savedUserId);
          if (found) setCurrentUser(found);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleSubscription = (type) => {
    if (!currentUser) return;
    
    fetch(`/api/users/${currentUser.id}/subscription?type=${type}`, {
      method: "PUT"
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to toggle subscription");
      })
      .then((updatedUser) => {
        setCurrentUser(updatedUser);
        // Refresh local storage and lists
        fetchUsers();
        // Trigger alert and reload page after a small delay
        alert(`Assinatura alterada para ${type.toUpperCase()} com sucesso!`);
        window.location.reload();
      })
      .catch((err) => {
        console.error(err);
        alert("Erro ao alterar assinatura. Certifique-se de que a API backend está ativa.");
      });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title block */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Nossos Planos & Acesso
        </h1>
        <p className="mt-3 text-sm text-gray-400 max-w-xl mx-auto">
          Escolha o nível de profundidade analítica que você precisa. Mude de plano a qualquer momento para fins de teste local.
        </p>
      </div>

      {/* Subscription Simulator area */}
      {currentUser && (
        <div className="rounded-2xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white">Simulador de Assinatura Local</h4>
            <p className="text-xs text-gray-400 mt-1">
              Você está logado como: <strong className="text-violet-300">{currentUser.name}</strong>. Plano ativo: <strong className="text-violet-300">{currentUser.subscriptionType}</strong>.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleSubscription("FREE")}
              disabled={currentUser.subscriptionType === "FREE"}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                currentUser.subscriptionType === "FREE"
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gray-900 border border-gray-700 text-white hover:bg-gray-800"
              }`}
            >
              Mudar para FREE
            </button>
            <button
              onClick={() => toggleSubscription("PREMIUM")}
              disabled={currentUser.subscriptionType === "PREMIUM"}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                currentUser.subscriptionType === "PREMIUM"
                  ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:opacity-90 shadow-md shadow-violet-500/15"
              }`}
            >
              Mudar para PREMIUM
            </button>
          </div>
        </div>
      )}

      {/* Plan comparisons grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* FREE PLAN */}
        <div className="glass-panel rounded-2xl p-8 border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Plano Gratuito</h3>
                <p className="text-xs text-gray-500 mt-1">Para entusiastas casuais.</p>
              </div>
              <span className="text-2xl font-black text-white">R$ 0</span>
            </div>
            
            <ul className="space-y-3 mt-6 border-t border-gray-800 pt-6 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Probabilidades de Resultado Final (1X2)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Acesso ao painel principal de partidas
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Histórico de calibração geral
              </li>
              <li className="flex items-center gap-2 text-gray-500 line-through">
                ✗ Probabilidade de Ambos Marcam (BTTS)
              </li>
              <li className="flex items-center gap-2 text-gray-500 line-through">
                ✗ Probabilidade de Over/Under 2.5 Gols
              </li>
              <li className="flex items-center gap-2 text-gray-500 line-through">
                ✗ Gráficos SHAP (Importância de features)
              </li>
              <li className="flex items-center gap-2 text-gray-500 line-through">
                ✗ Relatórios de Explicabilidade escritos por IA
              </li>
            </ul>
          </div>
          
          <button 
            disabled 
            className="w-full text-center py-3 text-xs font-bold rounded-xl bg-gray-900 border border-gray-800 text-gray-500 cursor-not-allowed mt-8 uppercase tracking-wider"
          >
            Plano Padrão Ativo
          </button>
        </div>

        {/* PREMIUM PLAN */}
        <div className="rounded-2xl p-8 border border-violet-500/30 bg-gradient-to-br from-violet-600/5 via-indigo-600/5 to-transparent flex flex-col justify-between relative shadow-[0_0_30px_rgba(99,102,241,0.05)]">
          {/* Badge */}
          <span className="absolute top-4 right-4 rounded-full bg-violet-500/10 border border-violet-500/30 px-3 py-1 text-[10px] font-extrabold text-violet-400 uppercase tracking-widest">
            Recomendado
          </span>

          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Plano Premium</h3>
                <p className="text-xs text-gray-500 mt-1">Para analistas e profissionais.</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white">R$ 39</span>
                <span className="text-[10px] text-gray-500 block">/mês</span>
              </div>
            </div>
            
            <ul className="space-y-3 mt-6 border-t border-gray-800 pt-6 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-violet-400">✓</span> Tudo do plano gratuito
              </li>
              <li className="flex items-center gap-2">
                <span className="text-violet-400">✓</span> Probabilidades de Ambos Marcam (BTTS)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-violet-400">✓</span> Probabilidades de Over/Under 2.5 Gols
              </li>
              <li className="flex items-center gap-2">
                <span className="text-violet-400">✓</span> <strong>Gráficos SHAP completos</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-violet-400">✓</span> <strong>Relatórios explicativos de IA</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-violet-400">✓</span> API JSON para integração própria
              </li>
            </ul>
          </div>

          <button
            onClick={() => toggleSubscription("PREMIUM")}
            className="w-full text-center py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:opacity-95 transition-all mt-8 uppercase tracking-wider shadow-lg shadow-violet-500/20"
          >
            Assinar Premium
          </button>
        </div>
      </div>
    </div>
  );
}
