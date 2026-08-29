import { FormEvent, useMemo, useState } from 'react';
import { HandCoins, Plus, Trash2, User } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { currencySymbol, formatDate, formatMoney, todayISO } from '../lib/format';
import { useFetch } from '../hooks/useApi';
import type { Loan, LoanDirection } from '../types';
import {
  Badge, Button, Card, EmptyState, ErrorMsg, Field, Input, Modal, ProgressBar, Select, Spinner, Textarea, cx,
} from '../components/ui';

type Tab = 'lent' | 'borrowed';

export default function Loans() {
  const { data, loading, error, refetch } = useFetch<Loan[]>('/loans');
  const [tab, setTab] = useState<Tab>('lent');
  const [newModal, setNewModal] = useState(false);
  const [payTo, setPayTo] = useState<Loan | null>(null);

  const loans = useMemo(() => (data ?? []).filter((l) => l.direction === tab), [data, tab]);

  const totals = useMemo(() => {
    const sum = (dir: LoanDirection) =>
      (data ?? []).filter((l) => l.direction === dir).reduce((s, l) => s + l.pending, 0);
    return { lent: sum('lent'), borrowed: sum('borrowed') };
  }, [data]);

  const remove = async (l: Loan) => {
    if (!confirm(`¿Eliminar el préstamo de ${l.person}?`)) return;
    await api.delete(`/loans/${l.id}`);
    void refetch();
  };

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-medium text-slate-500">Te deben</p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(totals.lent)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500">Debes</p>
          <p className="mt-1.5 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatMoney(totals.borrowed)}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {([
            ['lent', 'Me deben'],
            ['borrowed', 'Yo debo'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cx(
                'rounded-md px-4 py-1.5 text-sm font-medium transition',
                tab === value
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button onClick={() => setNewModal(true)}>
          <Plus size={16} />
          Nuevo préstamo
        </Button>
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      {loading ? (
        <Spinner />
      ) : !loans.length ? (
        <Card>
          <EmptyState
            title={tab === 'lent' ? 'Nadie te debe nada' : 'No debes nada'}
            description={
              tab === 'lent'
                ? 'Registra el dinero que prestaste para no perderle la pista.'
                : 'Registra el dinero que te prestaron para llevar el control.'
            }
            action={<Button onClick={() => setNewModal(true)}><Plus size={16} />Registrar préstamo</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loans.map((l) => {
            const overdue = !l.settled && l.due_date && l.due_date < todayISO();
            return (
              <Card key={l.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cx(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        l.settled
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300',
                      )}
                    >
                      {l.settled ? <HandCoins size={18} /> : <User size={18} />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{l.person}</p>
                      <p className="truncate text-xs text-slate-400">
                        {l.description || (l.direction === 'lent' ? 'Le presté' : 'Me prestó')} · {formatDate(l.date)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => void remove(l)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold">{formatMoney(l.pending)}</span>
                    <span className="text-xs text-slate-400">de {formatMoney(l.amount)}</span>
                  </div>
                  <ProgressBar percent={l.percent} color={l.settled ? '#10b981' : undefined} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                      {l.settled ? 'Saldado' : `Abonado ${formatMoney(l.paid)} (${l.percent}%)`}
                    </span>
                    {l.due_date && (
                      <span className={overdue ? 'font-medium text-rose-500' : 'text-slate-400'}>
                        {overdue ? 'Vencido ' : 'Vence '}
                        {formatDate(l.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                {l.settled ? (
                  <div className="mt-4">
                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      Pagado por completo
                    </Badge>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setPayTo(l)}>
                    <Plus size={14} />
                    Registrar abono
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={newModal} onClose={() => setNewModal(false)} title="Nuevo préstamo">
        <LoanForm
          defaultDirection={tab}
          onCancel={() => setNewModal(false)}
          onSaved={() => {
            setNewModal(false);
            void refetch();
          }}
        />
      </Modal>

      <Modal open={!!payTo} onClose={() => setPayTo(null)} title={payTo ? `Abono de ${payTo.person}` : ''}>
        {payTo && (
          <PaymentForm
            loan={payTo}
            onCancel={() => setPayTo(null)}
            onSaved={() => {
              setPayTo(null);
              void refetch();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/* --------------------------------------------------------------- LoanForm */
function LoanForm({
  defaultDirection, onSaved, onCancel,
}: {
  defaultDirection: LoanDirection;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [direction, setDirection] = useState<LoanDirection>(defaultDirection);
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!(Number(amount) > 0)) return setError('Ingresa un monto mayor a 0');

    setSaving(true);
    try {
      await api.post('/loans', {
        direction,
        person: person.trim(),
        amount: Number(amount),
        date,
        due_date: dueDate || null,
        description: description.trim() || null,
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
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {([
          ['lent', 'Me deben'],
          ['borrowed', 'Yo debo'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setDirection(value)}
            className={cx(
              'rounded-md py-2 text-sm font-medium transition',
              direction === value
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label={direction === 'lent' ? '¿A quién le prestaste?' : '¿Quién te prestó?'}>
        <Input required autoFocus value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Ej. Carlos" />
      </Field>

      <Field label="Monto">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {currencySymbol()}
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="pl-8 text-lg font-semibold"
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha del préstamo">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Fecha de pago" hint="Opcional">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Nota">
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
      </Field>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------ PaymentForm */
function PaymentForm({ loan, onSaved, onCancel }: { loan: Loan; onSaved: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!(Number(amount) > 0)) return setError('Ingresa un monto mayor a 0');

    setSaving(true);
    try {
      await api.post(`/loans/${loan.id}/payments`, { amount: Number(amount), date, note: note.trim() || null });
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
        Pendiente: <strong>{formatMoney(loan.pending)}</strong> de {formatMoney(loan.amount)}
      </p>

      <Field label="Monto del abono">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Nota">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </Field>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setAmount(String(loan.pending))}
        className="!px-0"
      >
        Abonar el total pendiente ({formatMoney(loan.pending)})
      </Button>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Registrar abono'}</Button>
      </div>
    </form>
  );
}
