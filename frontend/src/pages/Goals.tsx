import { FormEvent, useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { currencySymbol, formatDate, formatMoney, todayISO } from '../lib/format';
import { useFetch } from '../hooks/useApi';
import type { Goal } from '../types';
import {
  Button, Card, EmptyState, ErrorMsg, Field, Input, Modal, ProgressBar, Spinner, Textarea,
} from '../components/ui';

export default function Goals() {
  const { data, loading, error, refetch } = useFetch<Goal[]>('/goals');
  const [newModal, setNewModal] = useState(false);
  const [contributeTo, setContributeTo] = useState<Goal | null>(null);

  const remove = async (g: Goal) => {
    if (!confirm(`¿Eliminar la meta "${g.name}"?`)) return;
    await api.delete(`/goals/${g.id}`);
    void refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setNewModal(true)}>
          <Plus size={16} />
          Nueva meta
        </Button>
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      {loading ? (
        <Spinner />
      ) : !data?.length ? (
        <Card>
          <EmptyState
            title="Aún no tienes metas"
            description='Ej. "Comprar laptop" con objetivo de L 30,000.'
            action={<Button onClick={() => setNewModal(true)}><Plus size={16} />Crear meta</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((g) => {
            const done = g.percent >= 100;
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        done
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300'
                      }`}
                    >
                      <Target size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{g.name}</p>
                      {g.description && <p className="truncate text-xs text-slate-400">{g.description}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => void remove(g)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold">{formatMoney(g.current_amount)}</span>
                    <span className="text-xs text-slate-400">de {formatMoney(g.target_amount)}</span>
                  </div>
                  <ProgressBar percent={g.percent} color={done ? '#10b981' : undefined} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">{g.percent}% completado</span>
                    <span className="text-slate-400">
                      {done ? '¡Meta alcanzada!' : `Faltan ${formatMoney(g.remaining)}`}
                    </span>
                  </div>
                  {g.target_date && (
                    <p className="text-xs text-slate-400">Fecha objetivo: {formatDate(g.target_date)}</p>
                  )}
                </div>

                <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setContributeTo(g)}>
                  <Plus size={14} />
                  Agregar dinero
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={newModal} onClose={() => setNewModal(false)} title="Nueva meta">
        <GoalForm
          onCancel={() => setNewModal(false)}
          onSaved={() => {
            setNewModal(false);
            void refetch();
          }}
        />
      </Modal>

      <Modal
        open={!!contributeTo}
        onClose={() => setContributeTo(null)}
        title={contributeTo ? `Agregar a "${contributeTo.name}"` : ''}
      >
        {contributeTo && (
          <ContributionForm
            goal={contributeTo}
            onCancel={() => setContributeTo(null)}
            onSaved={() => {
              setContributeTo(null);
              void refetch();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function GoalForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!(Number(target) > 0)) return setError('El monto objetivo debe ser mayor a 0');

    setSaving(true);
    try {
      await api.post('/goals', {
        name: name.trim(),
        description: description.trim() || null,
        target_amount: Number(target),
        target_date: targetDate || null,
      });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nombre">
        <Input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Comprar laptop" />
      </Field>

      <Field label="Descripción">
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monto objetivo">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {currencySymbol()}
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="30000.00"
              className="pl-8"
            />
          </div>
        </Field>

        <Field label="Fecha objetivo">
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Crear meta'}</Button>
      </div>
    </form>
  );
}

function ContributionForm({
  goal, onSaved, onCancel,
}: {
  goal: Goal;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!value) return setError('Ingresa un monto (usa negativo para retirar)');

    setSaving(true);
    try {
      await api.post(`/goals/${goal.id}/contributions`, { amount: value, date, note: note.trim() || null });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-500">
        Llevas {formatMoney(goal.current_amount)} de {formatMoney(goal.target_amount)} · faltan{' '}
        {formatMoney(goal.remaining)}
      </p>

      <Field label="Monto" hint="Usa un valor negativo para retirar dinero de la meta">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {currencySymbol()}
          </span>
          <Input
            type="number"
            step="0.01"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="pl-8 text-lg font-semibold"
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Nota">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </Field>
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Agregar'}</Button>
      </div>
    </form>
  );
}
