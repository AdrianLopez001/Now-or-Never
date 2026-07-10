"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    if (saved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

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
    <header className="main-header sticky top-0 z-40 w-full backdrop-blur-md">
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

        {/* Personal Access Indicator & Theme Switcher */}
        <div className="flex items-center gap-3">
          <span className="rounded bg-gradient-to-r from-emerald-500 to-teal-600 px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center gap-1">
            🔓 Acesso Total <span className="hidden sm:inline">(Pessoal)</span>
          </span>
          
          <button
            onClick={toggleTheme}
            className="rounded-xl border border-gray-800 bg-gray-950/20 p-2 text-sm hover:bg-gray-800 transition-all duration-300 select-none cursor-pointer"
            title="Alternar Tema"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      {/* Mobile nav indicator bar */}
      <div className="mobile-sub-nav md:hidden py-2 px-4 flex gap-2">
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
