/** Moneda por defecto. Cambiar aquí (o desde Configuración) basta para toda la app. */
export const DEFAULT_CURRENCY = 'HNL';

const SYMBOLS: Record<string, string> = {
  HNL: 'L', USD: '$', EUR: '€', MXN: '$', GTQ: 'Q', CRC: '₡',
};

export const currencySymbol = (currency = DEFAULT_CURRENCY) => SYMBOLS[currency] ?? currency;

/** L 25,000.00 */
export function formatMoney(value: number | string, currency = DEFAULT_CURRENCY): string {
  const n = Number(value) || 0;
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currencySymbol(currency)} ${formatted}`;
}

/** Versión compacta para ejes de gráficos: L 25k */
export function formatCompact(value: number, currency = DEFAULT_CURRENCY): string {
  const symbol = currencySymbol(currency);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${symbol} ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${symbol} ${(value / 1_000).toFixed(0)}k`;
  return `${symbol} ${value.toFixed(0)}`;
}

/** 2026-08-29 -> 29 ago 2026 (sin desfase de zona horaria) */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${months[m - 1]} ${y}`;
}

export const todayISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Cuenta de ahorro' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'investment', label: 'Inversión' },
  { value: 'other', label: 'Otro' },
] as const;

export const accountTypeLabel = (type: string) =>
  ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
