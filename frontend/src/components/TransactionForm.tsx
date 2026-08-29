import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, apiError } from '../lib/api';
import { currencySymbol, todayISO } from '../lib/format';
import { useCatalogs } from '../hooks/useCatalogs';
import type { Transaction, TxType } from '../types';
import { Button, ErrorMsg, Field, Input, Select, cx } from './ui';

interface Props {
  /** Fija el tipo y oculta el selector (páginas de Ingresos / Gastos). */
  lockedType?: TxType;
  initialType?: TxType;
  editing?: Transaction | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function TransactionForm({ lockedType, initialType = 'expense', editing, onSaved, onCancel }: Props) {
  const { accounts, categories, paymentMethods, loading: catalogsLoading } = useCatalogs();

  const [type, setType] = useState<TxType>(lockedType ?? editing?.type ?? initialType);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '');
  const [accountId, setAccountId] = useState(editing?.account_id ?? '');
  const [methodId, setMethodId] = useState(editing?.payment_method_id ?? '');
  const [date, setDate] = useState(editing?.date?.slice(0, 10) ?? todayISO());
  const [description, setDescription] = useState(editing?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const typeCategories = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);

  // Preselecciona la primera cuenta / categoría en cuanto cargan los catálogos
  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    if (!typeCategories.some((c) => c.id === categoryId)) {
      setCategoryId(typeCategories[0]?.id ?? '');
    }
  }, [typeCategories, categoryId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError('Ingresa un monto mayor a 0');
    if (!accountId) return setError('Selecciona una cuenta');

    const payload = {
      type,
      amount: value,
      account_id: accountId,
      category_id: categoryId || null,
      payment_method_id: type === 'expense' && methodId ? methodId : null,
      description: description.trim() || null,
      date,
    };

    setSaving(true);
    try {
      if (editing) await api.put(`/transactions/${editing.id}`, payload);
      else await api.post('/transactions', payload);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (catalogsLoading) {
    return <p className="py-6 text-center text-sm text-slate-400">Cargando…</p>;
  }

  if (!accounts.length) {
    return (
      <div className="py-6 text-center text-sm text-slate-500">
        Primero crea una cuenta en la sección <strong>Cuentas</strong>.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!lockedType && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['expense', 'income'] as TxType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cx(
                'rounded-md py-2 text-sm font-medium transition',
                type === t
                  ? t === 'expense'
                    ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-900 dark:text-rose-400'
                    : 'bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              {t === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
      )}

      <Field label="Monto">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
            {currencySymbol()}
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-8 text-lg font-semibold"
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {typeCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Cuenta">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>

        {type === 'expense' && (
          <Field label="Método de pago">
            <Select value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              <option value="">—</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Descripción">
        <Input
          placeholder="Ej. Almuerzo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </form>
  );
}
