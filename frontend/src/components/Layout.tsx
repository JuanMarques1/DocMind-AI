import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/upload", label: "Upload", icon: "⬆️", end: false },
  { to: "/history", label: "Histórico", icon: "🗂️", end: false },
];

/** Estrutura geral da aplicação: sidebar + conteúdo. */
export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-8 flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            DocMind <span className="text-brand-600">AI</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
            >
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 md:hidden">
            DocMind AI
          </h1>
          <div className="hidden text-sm text-slate-500 dark:text-slate-400 md:block">
            Inteligência Documental
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
