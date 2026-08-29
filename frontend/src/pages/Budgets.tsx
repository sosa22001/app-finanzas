import { FormEvent, useState } from 'react';
import { AlertTriangle, Check, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { currencySymbol, formatMoney, MONTH_NAMES } from '../lib/format';
import { useFetch } from '../hooks/useApi';
import { useCatalogs } from '../hooks/useCatalogs';
import type { Budget } from '../types';
import {
  Button, Card, EmptyState, ErrorMsg, Field, Input, Modal, ProgressBar, Select, Spinner,
} from '../components/ui';

const now = new Date();

export default function Budgets() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [modal, setModal] = useState(false);

  const { data, loading, error, refetch } = useFetch<Budget[]>('/budgets', { month, year });
  const { categories } = useCatalogs();

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const totalBudget = (data ?? []).reduce((s, b) => s + b.amount, 0);
  const totalSpent = (data ?? []).reduce((s, b) => s + b.spent, 0);

  const remove = async (b: Budget) => {
    if (!confirm(`¿Eliminar el presupuesto de ${b.category?.name}?`)) return;
    await api.delete(`/budgets/${b.id}`);
    void refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2">
          <Field label="Mes">
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Año">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Button onClick={() => setModal(true)}>
          <Plus size={16} />
          Nuevo presupuesto
        </Button>
      </div>

      {(data?.length ?? 0) > 0 && (
        <Card>
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Presupuestado</p>
              <p className="text-xl font-bold">{formatMoney(totalBudget)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Gastado</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatMoney(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Disponible</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(totalBudget - totalSpent)}
              </p>
            </div>
          </div>
        </Card>
      )}

      <ErrorMsg>{error}</ErrorMsg>

      {loading ? (
        <Spinner />
      ) : !data?.length ? (
        <Card>
          <EmptyState
            title={`Sin presupuestos para ${MONTH_NAMES[month - 1]}`}
            description="Define cuánto quieres gastar por categoría este mes."
            action={<Button onClick={() => setModal(true)}><Plus size={16} />Crear presupuesto</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => {
            // Gastar exactamente el presupuesto no es excederse: eso es dar en el blanco.
            const over = b.spent > b.amount;
            const exact = !over && b.percent >= 100;
            const near = b.percent >= 80 && !over && !exact;
            const color = over ? '#e11d48' : exact ? '#10b981' : near ? '#f59e0b' : (b.category?.color ?? '#4f46e5');

            return (
              <Card key={b.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.category?.name ?? 'Categoría'}</p>
                    <p className="text-xs text-slate-400">Presupuesto {formatMoney(b.amount)}</p>
                  </div>
                  <button
                    onClick={() => void remove(b)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{formatMoney(b.spent)}</span>
                    <span className="text-xs font-medium" style={{ color }}>{b.percent}%</span>
                  </div>
                  <ProgressBar percent={b.percent} color={color} />
                  <p className="text-xs text-slate-400">
                    {b.available >= 0
                      ? `Disponible ${formatMoney(b.available)}`
                      : `Excedido por ${formatMoney(Math.abs(b.available))}`}
                  </p>
                </div>

                {(over || exact || near) && (
                  <div
                    className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                      over
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : exact
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {exact ? <Check size={14} /> : <AlertTriangle size={14} />}
                    {over
                      ? 'Superaste el presupuesto'
                      : exact
                        ? 'Justo en el presupuesto'
                        : 'Te estás acercando al límite'}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo presupuesto">
        <BudgetForm
          categories={expenseCategories}
          month={month}
          year={year}
          onCancel={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            void refetch();
          }}
        />
      </Modal>
    </div>
  );
}

function BudgetForm({
  categories, month, year, onSaved, onCancel,
}: {
  categories: { id: string; name: string }[];
  month: number;
  year: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!(Number(amount) > 0)) return setError('Ingresa un monto mayor a 0');

    setSaving(true);
    try {
      await api.post('/budgets', { category_id: categoryId, amount: Number(amount), month, year });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Categoría">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Monto mensual" hint={`Para ${MONTH_NAMES[month - 1]} ${year}`}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {currencySymbol()}
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="pl-8 text-lg font-semibold"
          />
        </div>
      </Field>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </form>
  );
}
