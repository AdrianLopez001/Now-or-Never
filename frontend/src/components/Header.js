"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    // Produção (Vercel): sem backend de usuários — usa modo Acesso Total estático
    const savedUserId = localStorage.getItem("now_or_never_user_id");
    if (!savedUserId) {
      localStorage.setItem("now_or_never_user_id", "static-user");
    }
  }, []);


  const handleUserChange = (e) => {
    const userId = e.target.value;
    const user = users.find((u) => u.id === userId);
    if (user) {
      setSelectedUser(user);
      localStorage.setItem("now_or_never_user_id", user.id);
      window.location.reload(); // Reload to refresh page predictions
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-[#090d16]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-xl font-extrabold tracking-wider text-transparent uppercase">
              Now Or Never
            </span>
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400 border border-violet-500/20">
              AI MVP
            </span>
          </Link>
          
          {/* Main Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/" 
                  ? "bg-gray-800 text-white" 
                  : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
              }`}
            >
              Partidas
            </Link>
            <Link
              href="/calibration"
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/calibration" 
                  ? "bg-gray-800 text-white" 
                  : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
              }`}
            >
              Calibração (Proof of Work)
            </Link>
          </nav>
        </div>

        {/* Personal Access Indicator */}
        <div className="flex items-center gap-4">
          <span className="rounded bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center gap-1">
            🔓 Acesso Total (Pessoal)
          </span>
        </div>
      </div>

      {/* Mobile nav indicator bar */}
      <div className="md:hidden border-t border-gray-800 bg-[#090d16]/95 py-2 px-4 flex gap-2">
        <Link
          href="/"
          className={`flex-1 text-center py-1 text-xs font-semibold rounded-md ${
            pathname === "/" ? "bg-gray-800 text-white" : "text-gray-400"
          }`}
        >
          Partidas
        </Link>
        <Link
          href="/calibration"
          className={`flex-1 text-center py-1 text-xs font-semibold rounded-md ${
            pathname === "/calibration" ? "bg-gray-800 text-white" : "text-gray-400"
          }`}
        >
          Calibração
        </Link>
      </div>
    </header>
  );
}
