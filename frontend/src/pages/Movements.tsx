import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Search } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import { useCatalogs } from '../hooks/useCatalogs';
import type { MovementRow, Transaction, Transfer } from '../types';
import { Badge, Card, EmptyState, ErrorMsg, Field, Input, Select, Spinner, Table, cx } from '../components/ui';

type KindFilter = 'all' | 'income' | 'expense' | 'transfer';

export default function Movements() {
  const { categories } = useCatalogs();
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Cargamos todo una vez y filtramos en cliente: es instantáneo y suficiente para un MVP.
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tx, tr] = await Promise.all([
          api.get<Transaction[]>('/transactions'),
          api.get<Transfer[]>('/transfers'),
        ]);

        const txRows: MovementRow[] = tx.data.map((t) => ({
          id: `t-${t.id}`,
          kind: t.type,
          date: t.date,
          description: t.description || t.category?.name || 'Sin descripción',
          category: t.category?.name ?? 'Sin categoría',
          categoryColor: t.category?.color ?? '#94a3b8',
          account: t.account?.name ?? '—',
          amount: Number(t.amount),
        }));

        const trRows: MovementRow[] = tr.data.map((t) => ({
          id: `f-${t.id}`,
          kind: 'transfer',
          date: t.date,
          description: t.description || 'Transferencia',
          category: 'Transferencia',
          categoryColor: '#0ea5e9',
          account: `${t.from_account?.name ?? '?'} → ${t.to_account?.name ?? '?'}`,
          amount: Number(t.amount),
        }));

        setRows([...txRows, ...trRows].sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== 'all' && r.kind !== kind) return false;
      if (categoryId) {
        const cat = categories.find((c) => c.id === categoryId);
        if (!cat || r.category !== cat.name) return false;
      }
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (q && !`${r.description} ${r.category} ${r.account}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, kind, categoryId, from, to, categories]);

  const totals = useMemo(
    () => ({
      income: filtered.filter((r) => r.kind === 'income').reduce((s, r) => s + r.amount, 0),
      expense: filtered.filter((r) => r.kind === 'expense').reduce((s, r) => s + r.amount, 0),
    }),
    [filtered],
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <Field label="Buscar">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Descripción, categoría, cuenta…"
                  className="pl-9"
                />
              </div>
            </Field>
          </div>

          <Field label="Tipo">
            <Select value={kind} onChange={(e) => setKind(e.target.value as KindFilter)}>
              <option value="all">Todos</option>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
              <option value="transfer">Transferencia</option>
            </Select>
          </Field>

          <Field label="Categoría">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'income' ? 'ingreso' : 'gasto'})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Desde">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Hasta">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
          <span className="text-slate-500">{filtered.length} movimientos</span>
          <span className="text-emerald-600 dark:text-emerald-400">Ingresos {formatMoney(totals.income)}</span>
          <span className="text-rose-600 dark:text-rose-400">Gastos {formatMoney(totals.expense)}</span>
        </div>
      </Card>

      <ErrorMsg>{error}</ErrorMsg>

      <Card className="p-0 sm:p-0">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin resultados" description="Ajusta los filtros o registra un nuevo movimiento." />
        ) : (
          <div className="p-2 sm:p-3">
            <Table headers={['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cuenta', 'Monto']}>
              {filtered.map((r) => (
                <tr key={r.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(r.date)}</td>
                  <td className="px-3 py-3">
                    <TypeBadge kind={r.kind} />
                  </td>
                  <td className="px-3 py-3 font-medium">{r.description}</td>
                  <td className="px-3 py-3">
                    <Badge color={r.categoryColor}>{r.category}</Badge>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{r.account}</td>
                  <td
                    className={cx(
                      'whitespace-nowrap px-3 py-3 font-semibold',
                      r.kind === 'income' && 'text-emerald-600 dark:text-emerald-400',
                      r.kind === 'expense' && 'text-rose-600 dark:text-rose-400',
                      r.kind === 'transfer' && 'text-sky-600 dark:text-sky-400',
                    )}
                  >
                    {r.kind === 'income' ? '+' : r.kind === 'expense' ? '−' : ''} {formatMoney(r.amount)}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function TypeBadge({ kind }: { kind: MovementRow['kind'] }) {
  const map = {
    income: { label: 'Ingreso', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
    expense: { label: 'Gasto', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
    transfer: { label: 'Transferencia', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' },
  }[kind];

  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', map.className)}>
      {kind === 'transfer' && <ArrowLeftRight size={12} />}
      {map.label}
    </span>
  );
}
