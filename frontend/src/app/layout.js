import "./globals.css";
import Header from "../components/Header";

export const metadata = {
  title: "MatchMind AI | Copa do Mundo 2026 — Probabilidades & Análise de Apostas",
  description: "Análise preditiva por Inteligência Artificial para apostas esportivas na Copa do Mundo FIFA 2026. Probabilidades de vitória, BTTS, Over/Under, escanteios e cartões com consenso de 3 modelos de IA.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className="min-h-screen bg-[#090d16] flex flex-col text-slate-100 font-sans">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
          {children}
        </main>
        <footer className="border-t border-gray-900 bg-[#060910] py-6 text-center text-xs text-gray-600">
          <p>© {new Date().getFullYear()} NOW OR NEVER AI. Ferramenta analítica e editorial de inteligência esportiva. Não facilitamos ou promovemos apostas.</p>
        </footer>
      </body>
    </html>
  );
}
