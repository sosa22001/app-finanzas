import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeftRight, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { ACCOUNT_TYPES, accountTypeLabel, currencySymbol, formatDate, formatMoney, todayISO } from '../lib/format';
import type { Account, Transfer } from '../types';
import {
  Button, Card, CardTitle, EmptyState, ErrorMsg, Field, Input, Modal, Select, Spinner, Table, cx,
} from '../components/ui';

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountModal, setAccountModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [transferModal, setTransferModal] = useState(false);

  const openNew = () => {
    setEditing(null);
    setAccountModal(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setAccountModal(true);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, t] = await Promise.all([api.get<Account[]>('/accounts'), api.get<Transfer[]>('/transfers')]);
      setAccounts(a.data);
      setTransfers(t.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const removeAccount = async (a: Account) => {
    if (!confirm(`¿Eliminar la cuenta "${a.name}"? Se borrarán también sus movimientos.`)) return;
    try {
      await api.delete(`/accounts/${a.id}`);
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const total = accounts.reduce((s, a) => s + Number(a.current_balance), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Balance total</p>
          <p className="text-2xl font-bold tracking-tight">{formatMoney(total)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTransferModal(true)} disabled={accounts.length < 2}>
            <ArrowLeftRight size={16} />
            Transferir
          </Button>
          <Button onClick={openNew}>
            <Plus size={16} />
            Nueva cuenta
          </Button>
        </div>
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            title="No tienes cuentas"
            description="Crea una cuenta (efectivo, banco, ahorro…) para registrar tus movimientos."
            action={<Button onClick={openNew}><Plus size={16} />Crear cuenta</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
                    <Wallet size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.name}</p>
                    <p className="text-xs text-slate-400">
                      {accountTypeLabel(a.type)}
                      {a.institution ? ` · ${a.institution}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(a)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                    aria-label="Editar cuenta"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => void removeAccount(a)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    aria-label="Eliminar cuenta"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <p
                className={cx(
                  'mt-4 text-2xl font-bold tracking-tight',
                  Number(a.current_balance) < 0 && 'text-rose-600 dark:text-rose-400',
                )}
              >
                {formatMoney(a.current_balance, a.currency)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Inicial: {formatMoney(a.initial_balance, a.currency)}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-0 sm:p-0">
        <div className="p-5 pb-0">
          <CardTitle>Transferencias recientes</CardTitle>
        </div>
        {transfers.length === 0 ? (
          <EmptyState title="Sin transferencias" description="Mueve dinero entre tus cuentas sin afectar ingresos ni gastos." />
        ) : (
          <div className="px-3 pb-3">
            <Table headers={['Fecha', 'Desde', 'Hacia', 'Descripción', 'Monto', '']}>
              {transfers.map((t) => (
                <tr key={t.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-3 py-3">{t.from_account?.name ?? '—'}</td>
                  <td className="px-3 py-3">{t.to_account?.name ?? '—'}</td>
                  <td className="px-3 py-3 text-slate-500">{t.description || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-sky-600 dark:text-sky-400">
                    {formatMoney(t.amount)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={async () => {
                        if (!confirm('¿Eliminar esta transferencia?')) return;
                        await api.delete(`/transfers/${t.id}`);
                        void load();
                      }}
                      className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      aria-label="Eliminar transferencia"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>

      <Modal
        open={accountModal}
        onClose={() => setAccountModal(false)}
        title={editing ? `Editar "${editing.name}"` : 'Nueva cuenta'}
      >
        <AccountForm
          editing={editing}
          onCancel={() => setAccountModal(false)}
          onSaved={() => {
            setAccountModal(false);
            void load();
          }}
        />
      </Modal>

      <Modal open={transferModal} onClose={() => setTransferModal(false)} title="Nueva transferencia">
        <TransferForm
          accounts={accounts}
          onCancel={() => setTransferModal(false)}
          onSaved={() => {
            setTransferModal(false);
            void load();
          }}
        />
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------ AccountForm */
function AccountForm({
  editing, onSaved, onCancel,
}: {
  editing: Account | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<string>(editing?.type ?? 'cash');
  const [initialBalance, setInitialBalance] = useState(String(editing?.initial_balance ?? '0'));
  const [institution, setInstitution] = useState(editing?.institution ?? '');
  const [last4, setLast4] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: name.trim(),
      type,
      initial_balance: Number(initialBalance) || 0,
      currency: 'HNL',
      institution: institution.trim() || null,
      last4: /^\d{4}$/.test(last4) ? last4 : null,
    };

    try {
      if (editing) await api.put(`/accounts/${editing.id}`, payload);
      else await api.post('/accounts', payload);
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
        <Input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. BAC Ahorro" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Balance inicial" hint="El dinero que ya tenías antes de empezar a registrar">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {currencySymbol()}
            </span>
            <Input
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="pl-8"
            />
          </div>
        </Field>

        <Field label="Institución">
          <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Opcional" />
        </Field>

        <Field label="Últimos 4 dígitos" hint="Nunca guardamos el número completo">
          <Input
            inputMode="numeric"
            maxLength={4}
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
            placeholder="Opcional"
          />
        </Field>
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------- TransferForm */
function TransferForm({
  accounts, onSaved, onCancel,
}: {
  accounts: Account[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '');
  const [toId, setToId] = useState(accounts[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fromId === toId) return setError('Las cuentas de origen y destino deben ser distintas');
    if (!(Number(amount) > 0)) return setError('Ingresa un monto mayor a 0');

    setSaving(true);
    try {
      await api.post('/transfers', {
        from_account_id: fromId,
        to_account_id: toId,
        amount: Number(amount),
        date,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desde">
          <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Hacia">
          <Select value={toId} onChange={(e) => setToId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Monto">
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
        <Field label="Descripción">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
        </Field>
      </div>

      <p className="text-xs text-slate-400">
        Una transferencia no cuenta como ingreso ni gasto; solo mueve el saldo entre cuentas.
      </p>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Transferir'}</Button>
      </div>
    </form>
  );
}
