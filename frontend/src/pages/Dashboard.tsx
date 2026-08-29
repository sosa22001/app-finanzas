import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useFetch } from '../hooks/useApi';
import { formatCompact, formatDate, formatMoney, MONTH_NAMES } from '../lib/format';
import type { Dashboard as DashboardData } from '../types';
import { Badge, Card, CardTitle, EmptyState, ErrorMsg, ProgressBar, Spinner, cx } from '../components/ui';

export default function Dashboard() {
  const { data, loading, error } = useFetch<DashboardData>('/dashboard');

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (!data) return null;

  const { summary, insights, monthlySeries, expensesByCategory, recentTransactions, goals, period } = data;
  const hasExpenses = expensesByCategory.length > 0;

  return (
    <div className="space-y-6">
      {/* --- Tarjetas de resumen --- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Balance total"
          value={formatMoney(summary.totalBalance)}
          icon={<Wallet size={18} />}
          tone="brand"
        />
        <StatCard
          label={`Ingresos de ${MONTH_NAMES[period.month - 1]}`}
          value={formatMoney(summary.monthIncome)}
          icon={<TrendingUp size={18} />}
          tone="emerald"
        />
        <StatCard
          label={`Gastos de ${MONTH_NAMES[period.month - 1]}`}
          value={formatMoney(summary.monthExpense)}
          icon={<TrendingDown size={18} />}
          tone="rose"
        />
        <StatCard
          label="Ahorro del mes"
          value={formatMoney(summary.savings)}
          hint={`Tasa de ahorro ${summary.savingsRate}%`}
          icon={<PiggyBank size={18} />}
          tone={summary.savings >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* --- Insights --- */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Insight text={`Este mes gastaste ${formatMoney(insights.spentThisMonth)}`} />
        <Insight
          text={
            insights.topCategory
              ? `Tu categoría con mayor gasto es ${insights.topCategory.name} (${formatMoney(insights.topCategory.amount)})`
              : 'Aún no has registrado gastos este mes'
          }
        />
        <Insight
          text={
            insights.savedThisMonth >= 0
              ? `Has ahorrado ${formatMoney(insights.savedThisMonth)} este mes`
              : `Este mes gastaste ${formatMoney(Math.abs(insights.savedThisMonth))} más de lo que ingresaste`
          }
        />
      </div>

      {/* --- Gráficos --- */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle>Ingresos vs Gastos (últimos 6 meses)</CardTitle>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
              <YAxis
                tickFormatter={(v) => formatCompact(Number(v))}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="#94a3b8"
                width={64}
              />
              <Tooltip
                formatter={(v: number) => formatMoney(v)}
                contentStyle={tooltipStyle}
                cursor={{ fill: '#94a3b81a' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="expense" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Gastos por categoría</CardTitle>
          {hasExpenses ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {expensesByCategory.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Sin gastos este mes" description="Registra un gasto para ver el desglose." />
          )}
        </Card>
      </div>

      {/* --- Movimientos recientes + Metas --- */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle
            action={
              <Link to="/movimientos" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Ver todos
              </Link>
            }
          >
            Últimos movimientos
          </CardTitle>

          {recentTransactions.length === 0 ? (
            <EmptyState title="Todavía no hay movimientos" description="Usa “+ Agregar movimiento” para empezar." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-lg"
                    style={{ backgroundColor: `${t.category?.color ?? '#94a3b8'}22` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.description || t.category?.name || 'Sin descripción'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(t.date)} · {t.account?.name ?? '—'}
                    </p>
                  </div>
                  <span
                    className={cx(
                      'shrink-0 text-sm font-semibold',
                      t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {t.type === 'income' ? '+' : '−'} {formatMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle
            action={
              <Link to="/metas" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Ver todas
              </Link>
            }
          >
            Metas de ahorro
          </CardTitle>

          {goals.length === 0 ? (
            <EmptyState title="Sin metas" description="Crea una meta para empezar a ahorrar con objetivo." />
          ) : (
            <div className="space-y-4">
              {goals.slice(0, 4).map((g) => (
                <div key={g.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {g.percent}%
                    </Badge>
                  </div>
                  <ProgressBar percent={g.percent} />
                  <p className="mt-1.5 text-xs text-slate-400">
                    {formatMoney(g.current_amount)} de {formatMoney(g.target_amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 12,
  background: '#fff',
  color: '#0f172a',
};

function StatCard({
  label, value, hint, icon, tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: 'brand' | 'emerald' | 'rose';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  };
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones[tone])}>{icon}</span>
      </div>
    </Card>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      {text}
    </div>
  );
}
