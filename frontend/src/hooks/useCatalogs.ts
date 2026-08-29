import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Account, Category, PaymentMethod } from '../types';

/** Cuentas + categorías + métodos de pago: lo que casi todos los formularios necesitan. */
export function useCatalogs() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c, p] = await Promise.all([
        api.get<Account[]>('/accounts'),
        api.get<Category[]>('/categories'),
        api.get<PaymentMethod[]>('/categories/payment-methods/all'),
      ]);
      setAccounts(a.data);
      setCategories(c.data);
      setPaymentMethods(p.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { accounts, categories, paymentMethods, loading, reload: load };
}
