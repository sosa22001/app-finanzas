import { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../middleware/error';
import { lastMonths, monthRange } from './dates';

type Tx = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  account: { name: string } | null;
  category: { id: string; name: string; color: string } | null;
};

export async function buildDashboard(db: SupabaseClient, year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const months = lastMonths(year, month, 6);
  const historyStart = monthRange(months[0].year, months[0].month).start;

  const [balances, monthTx, historyTx, recent, goals] = await Promise.all([
    db.from('account_balances').select('current_balance, currency').eq('archived', false),
    db
      .from('transactions')
      .select('type, amount, category_id, category:categories(id, name, color)')
      .gte('date', start)
      .lte('date', end),
    db.from('transactions').select('type, amount, date').gte('date', historyStart).lte('date', end),
    db
      .from('transactions')
      .select('id, type, amount, description, date, account:accounts(name), category:categories(id, name, color)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8),
    db.from('goals').select('id, name, target_amount, target_date, contributions:goal_contributions(amount)'),
  ]);

  for (const r of [balances, monthTx, historyTx, recent, goals]) {
    if (r.error) throw new HttpError(400, r.error.message);
  }

  // --- Totales del mes ---
  const totalBalance = (balances.data ?? []).reduce((s, a) => s + Number(a.current_balance), 0);

  let monthIncome = 0;
  let monthExpense = 0;
  const byCategory = new Map<string, { name: string; color: string; value: number }>();

  for (const t of (monthTx.data ?? []) as unknown as Tx[]) {
    const amount = Number(t.amount);
    if (t.type === 'income') {
      monthIncome += amount;
    } else {
      monthExpense += amount;
      const key = t.category?.id ?? 'sin-categoria';
      const entry = byCategory.get(key) ?? {
        name: t.category?.name ?? 'Sin categoría',
        color: t.category?.color ?? '#94a3b8',
        value: 0,
      };
      entry.value += amount;
      byCategory.set(key, entry);
    }
  }

  const savings = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? (savings / monthIncome) * 100 : 0;

  // --- Serie histórica (6 meses) ---
  const buckets = new Map(months.map((m) => [`${m.year}-${String(m.month).padStart(2, '0')}`, { income: 0, expense: 0 }]));
  for (const t of historyTx.data ?? []) {
    const key = String(t.date).slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (t.type === 'income') bucket.income += Number(t.amount);
    else bucket.expense += Number(t.amount);
  }

  const monthlySeries = months.map((m) => {
    const key = `${m.year}-${String(m.month).padStart(2, '0')}`;
    const bucket = buckets.get(key)!;
    return { month: m.label, income: bucket.income, expense: bucket.expense, savings: bucket.income - bucket.expense };
  });

  const expensesByCategory = [...byCategory.values()].sort((a, b) => b.value - a.value);
  const topCategory = expensesByCategory[0] ?? null;

  const goalCards = (goals.data ?? []).map((g) => {
    const target = Number(g.target_amount);
    const current = (g.contributions ?? []).reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);
    return {
      id: g.id,
      name: g.name,
      target_amount: target,
      current_amount: current,
      target_date: g.target_date,
      percent: target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0,
    };
  });

  return {
    period: { year, month, start, end },
    summary: {
      totalBalance,
      monthIncome,
      monthExpense,
      savings,
      savingsRate: Math.round(savingsRate * 10) / 10,
    },
    monthlySeries,
    expensesByCategory,
    recentTransactions: recent.data ?? [],
    goals: goalCards,
    insights: {
      spentThisMonth: monthExpense,
      topCategory: topCategory ? { name: topCategory.name, amount: topCategory.value } : null,
      savedThisMonth: savings,
    },
  };
}
