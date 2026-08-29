export type TxType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  institution: string | null;
  initial_balance: number;
  current_balance: number;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  color: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string | null;
  date: string;
  account_id: string;
  category_id: string | null;
  payment_method_id: string | null;
  account: { id: string; name: string } | null;
  category: { id: string; name: string; color: string } | null;
  payment_method: { id: string; name: string } | null;
}

export interface Transfer {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  from_account_id: string;
  to_account_id: string;
  from_account: { id: string; name: string } | null;
  to_account: { id: string; name: string } | null;
}

export interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  category_id: string;
  category: { id: string; name: string; color: string } | null;
  spent: number;
  available: number;
  percent: number;
}

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  remaining: number;
  percent: number;
  target_date: string | null;
  completed: boolean;
}

export type LoanDirection = 'lent' | 'borrowed';

export interface Loan {
  id: string;
  direction: LoanDirection;
  person: string;
  amount: number;
  description: string | null;
  date: string;
  due_date: string | null;
  /** Suma de abonos */
  paid: number;
  /** amount - paid */
  pending: number;
  percent: number;
  settled: boolean;
}

export interface Dashboard {
  period: { year: number; month: number; start: string; end: string };
  summary: {
    totalBalance: number;
    monthIncome: number;
    monthExpense: number;
    savings: number;
    savingsRate: number;
  };
  monthlySeries: { month: string; income: number; expense: number; savings: number }[];
  expensesByCategory: { name: string; color: string; value: number }[];
  recentTransactions: {
    id: string;
    type: TxType;
    amount: number;
    description: string | null;
    date: string;
    account: { name: string } | null;
    category: { name: string; color: string } | null;
  }[];
  goals: {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
    percent: number;
  }[];
  insights: {
    spentThisMonth: number;
    topCategory: { name: string; amount: number } | null;
    savedThisMonth: number;
  };
}

/** Fila unificada usada en la página de Movimientos. */
export interface MovementRow {
  id: string;
  kind: 'income' | 'expense' | 'transfer';
  date: string;
  description: string;
  category: string;
  categoryColor: string;
  account: string;
  amount: number;
}
