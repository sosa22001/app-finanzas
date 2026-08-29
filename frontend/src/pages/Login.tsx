import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorMsg, Field, Input } from '../components/ui';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Wallet size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Finanzas</h1>
          <p className="text-sm text-slate-500">Controla tus ingresos y gastos</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <Field label="Correo electrónico">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </Field>

          <Field label="Contraseña">
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <ErrorMsg>{error}</ErrorMsg>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </Button>

          <p className="text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
