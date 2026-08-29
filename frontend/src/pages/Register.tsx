import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorMsg, Field, Input } from '../components/ui';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');

    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email, password, fullName);
      if (needsConfirmation) {
        setInfo('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
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
          <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
          <p className="text-sm text-slate-500">Empieza a controlar tu dinero hoy</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <Field label="Nombre">
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" />
          </Field>

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

          <Field label="Contraseña" hint="Mínimo 6 caracteres">
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <ErrorMsg>{error}</ErrorMsg>
          {info && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              {info}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creando…' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
