# App de Finanzas Personales

MVP para administrar ingresos, gastos, cuentas, categorías, presupuestos, metas, préstamos,
transferencias y movimientos.

**Stack:** React + Vite + TS + Tailwind + React Router + Recharts + Supabase (frontend) · Node + Express + TS + Supabase (backend).

## Puesta en marcha (5 minutos)

### 1. Crear proyecto en Supabase
1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Cuando termine, ve a **SQL Editor** → **New query**, pega **todo** el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo (**Run**).
3. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public` key

### 2. Variables de entorno

`backend/.env` (copia de `backend/.env.example`):

```
PORT=4000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

`frontend/.env` (copia de `frontend/.env.example`):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Instalar y ejecutar

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000

Regístrate con email + contraseña. Supabase crea automáticamente tu perfil, una cuenta
"Efectivo", métodos de pago y las categorías por defecto.

> Si quieres registrarte sin confirmar el correo: en Supabase → **Authentication → Providers → Email**
> desactiva *Confirm email*.

## Estructura

```
app gastos e ingresos/
├── package.json            # workspaces + script dev (levanta API y web juntos)
├── supabase/
│   └── schema.sql          # tablas, índices, triggers, RLS, datos por defecto
├── backend/
│   └── src/
│       ├── config/         # env + cliente supabase
│       ├── middleware/      # auth (JWT) + manejo de errores
│       ├── routes/          # transactions, accounts, categories, transfers, budgets, goals, loans, dashboard
│       ├── services/        # cálculos del dashboard
│       ├── app.ts
│       └── server.ts
└── frontend/
    └── src/
        ├── components/      # ui.tsx (primitivos), Layout, modales
        ├── context/         # Auth + Theme
        ├── hooks/
        ├── lib/             # supabase, api (axios), formato de moneda
        ├── pages/           # Login, Register, Dashboard, Movements, Ingresos, Gastos, Cuentas,
        │                    #   Presupuestos, Metas, Préstamos, Configuración
        └── App.tsx
```

## Desplegar en Vercel

Son **dos proyectos de Vercel** apuntando al mismo repositorio, cambiando el *Root Directory*.
Primero sube el código a GitHub (`git init`, commit, push).

### 1. Backend

New Project → importa el repo → **Root Directory: `backend`**.

Environment Variables:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | tu Project URL de Supabase |
| `SUPABASE_ANON_KEY` | tu publishable key (`sb_publishable_…`) |
| `CORS_ORIGIN` | la URL del frontend, ej. `https://app-finanzas.vercel.app` |

Deploy. Verifica que `https://TU-BACKEND.vercel.app/api/health` devuelva `{"ok":true}`.

### 2. Frontend

New Project → mismo repo → **Root Directory: `frontend`**.

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | tu Project URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | tu publishable key |
| `VITE_API_URL` | `https://TU-BACKEND.vercel.app/api` |

Deploy. Como las variables `VITE_*` se incrustan en el bundle al compilar, si cambias alguna
después hay que **redesplegar** para que tome efecto.

### 3. Supabase

**Authentication → URL Configuration** → agrega la URL del frontend en *Site URL* y en
*Redirect URLs*.

### Notas

- `backend/api/index.ts` expone la app Express como Serverless Function; `backend/vercel.json`
  reenvía todas las rutas ahí.
- `frontend/vercel.json` manda todo a `index.html` para que React Router funcione al recargar
  en rutas como `/gastos`.
- El CORS acepta cualquier dominio `*.vercel.app` (para los previews) más lo que listes en
  `CORS_ORIGIN`.
- Nunca pongas la **secret key** de Supabase en el frontend: se salta el RLS.

## Préstamos

La sección **Préstamos** lleva dos listas: *Me deben* (dinero que prestaste) y *Yo debo*.
Cada préstamo guarda persona, monto, fecha, fecha de pago opcional y abonos parciales; el pendiente
se calcula desde los abonos y se marca como saldado al llegar a cero.

Los préstamos **no** afectan el balance de las cuentas ni cuentan como ingreso/gasto — son un
registro aparte. Si quieres que el movimiento de dinero se refleje en tu balance, registra además
el gasto/ingreso correspondiente.
