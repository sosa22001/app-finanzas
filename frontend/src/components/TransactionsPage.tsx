import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import { useFetch } from '../hooks/useApi';
import type { Transaction, TxType } from '../types';
import TransactionForm from './TransactionForm';
import { Badge, Button, Card, EmptyState, ErrorMsg, Modal, Spinner, Table, cx } from './ui';

/** Página CRUD compartida por Ingresos y Gastos. */
export default function TransactionsPage({ type }: { type: TxType }) {
  const { data, loading, error, refetch } = useFetch<Transaction[]>('/transactions', { type });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isIncome = type === 'income';
  const total = (data ?? []).reduce((s, t) => s + Number(t.amount), 0);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setModalOpen(true);
  };

  const remove = async (t: Transaction) => {
    if (!confirm(`¿Eliminar "${t.description || t.category?.name || 'este movimiento'}"?`)) return;
    setActionError(null);
    try {
      await api.delete(`/transactions/${t.id}`);
      void refetch();
    } catch (err) {
      setActionError(apiError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Total registrado</p>
          <p className={cx('text-2xl font-bold', isIncome ? 'text-emerald-600' : 'text-rose-600')}>
            {formatMoney(total)}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} />
          {isIncome ? 'Nuevo ingreso' : 'Nuevo gasto'}
        </Button>
      </div>

      <ErrorMsg>{error ?? actionError}</ErrorMsg>

      <Card className="p-0 sm:p-0">
        {loading ? (
          <Spinner />
        ) : !data?.length ? (
          <EmptyState
            title={isIncome ? 'Aún no hay ingresos' : 'Aún no hay gastos'}
            description="Registra el primero para que aparezca aquí y en el dashboard."
            action={
              <Button onClick={openNew}>
                <Plus size={16} />
                Registrar
              </Button>
            }
          />
        ) : (
          <div className="p-2 sm:p-3">
            <Table
              headers={
                isIncome
                  ? ['Fecha', 'Descripción', 'Categoría', 'Cuenta', 'Monto', '']
                  : ['Fecha', 'Descripción', 'Categoría', 'Cuenta', 'Método', 'Monto', '']
              }
            >
              {data.map((t) => (
                <tr key={t.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-3 py-3 font-medium">{t.description || '—'}</td>
                  <td className="px-3 py-3">
                    {t.category ? <Badge color={t.category.color}>{t.category.name}</Badge> : '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{t.account?.name ?? '—'}</td>
                  {!isIncome && <td className="px-3 py-3 text-slate-500">{t.payment_method?.name ?? '—'}</td>}
                  <td
                    className={cx(
                      'whitespace-nowrap px-3 py-3 font-semibold',
                      isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {isIncome ? '+' : '−'} {formatMoney(t.amount)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                        aria-label="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => void remove(t)}
                        className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar movimiento' : isIncome ? 'Nuevo ingreso' : 'Nuevo gasto'}
        wide
      >
        <TransactionForm
          lockedType={type}
          editing={editing}
          onCancel={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            void refetch();
          }}
        />
      </Modal>
    </div>
  );
}
