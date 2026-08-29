import { FormEvent, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { DEFAULT_CURRENCY, currencySymbol } from '../lib/format';
import { useCatalogs } from '../hooks/useCatalogs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { TxType } from '../types';
import {
  Badge, Button, Card, CardTitle, ErrorMsg, Field, Input, Modal, Select, Spinner,
} from '../components/ui';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { categories, loading, reload } = useCatalogs();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Los movimientos quedarán sin categoría.`)) return;
    try {
      await api.delete(`/categories/${id}`);
      void reload();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const groups: { type: TxType; label: string }[] = [
    { type: 'expense', label: 'Categorías de gasto' },
    { type: 'income', label: 'Categorías de ingreso' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Cuenta</CardTitle>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Correo</dt>
            <dd className="mt-0.5 truncate text-sm font-medium">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Moneda</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {DEFAULT_CURRENCY} — Lempira ({currencySymbol()})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tema</dt>
            <dd className="mt-0.5">
              <Button size="sm" variant="secondary" onClick={toggle}>
                {theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
              </Button>
            </dd>
          </div>
        </dl>
      </Card>

      <ErrorMsg>{error}</ErrorMsg>

      {loading ? (
        <Spinner />
      ) : (
        groups.map(({ type, label }) => (
          <Card key={type}>
            <CardTitle
              action={
                <Button size="sm" variant="secondary" onClick={() => setModal(true)}>
                  <Plus size={14} />
                  Nueva
                </Button>
              }
            >
              {label}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <span key={c.id} className="group inline-flex items-center">
                    <Badge color={c.color}>{c.name}</Badge>
                    <button
                      onClick={() => void remove(c.id, c.name)}
                      className="ml-1 rounded p-1 text-slate-300 transition hover:text-rose-500"
                      aria-label={`Eliminar ${c.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                ))}
            </div>
          </Card>
        ))
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva categoría">
        <CategoryForm
          onCancel={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            void reload();
          }}
        />
      </Modal>
    </div>
  );
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];

function CategoryForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TxType>('expense');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/categories', { name: name.trim(), type, color });
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
        <Input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Mascotas" />
      </Field>

      <Field label="Tipo">
        <Select value={type} onChange={(e) => setType(e.target.value as TxType)}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </Select>
      </Field>

      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-8 w-8 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''}`}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </Field>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Crear'}</Button>
      </div>
    </form>
  );
}
