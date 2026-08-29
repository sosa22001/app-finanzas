import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight, HandCoins, LayoutDashboard, Menu, Moon, PiggyBank, Plus, Settings,
  Sun, Target, TrendingDown, TrendingUp, Wallet, LogOut, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, cx } from '../components/ui';
import QuickTransactionModal from '../components/QuickTransactionModal';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/gastos', label: 'Gastos', icon: TrendingDown },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/presupuestos', label: 'Presupuestos', icon: PiggyBank },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/prestamos', label: 'Préstamos', icon: HandCoins },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  const title = NAV.find((n) => (n.end ? n.to === location.pathname : location.pathname.startsWith(n.to)))?.label
    ?? 'Dashboard';

  return (
    <div className="min-h-screen lg:flex">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform',
          'dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Wallet size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight">Finanzas</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-2 truncate px-2 text-xs text-slate-400">{user?.email}</div>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Button onClick={() => setQuickOpen(true)} className="whitespace-nowrap">
            <Plus size={16} />
            <span className="hidden sm:inline">Agregar movimiento</span>
          </Button>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet key={refreshKey} context={{ refresh: () => setRefreshKey((k) => k + 1) }} />
        </main>
      </div>

      <QuickTransactionModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
