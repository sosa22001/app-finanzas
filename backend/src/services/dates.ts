const pad = (n: number) => String(n).padStart(2, '0');

/** Primer y último día del mes en formato YYYY-MM-DD. */
export function monthRange(year: number, month: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(last)}`,
  };
}

/** Los últimos `count` meses terminando en (year, month), del más antiguo al más reciente. */
export function lastMonths(year: number, month: number, count: number) {
  const months: { year: number; month: number; label: string }[] = [];
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    months.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      label: names[d.getUTCMonth()],
    });
  }
  return months;
}
