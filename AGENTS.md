# AGENTS.md — RemocaoAlpha

## Lint, Typecheck, Test, Dev commands

```bash
npm run dev        # Vite dev server on :3000
npm run build      # tsc + vite build
npm run lint       # oxlint
```

Tests: `vitest` (configured via `vitest.config.ts`), environment `happy-dom`.

Type-check: `npx tsc --noEmit -p tsconfig.app.json`

## Architecture

Supabase is the **source of truth**. The frontend is an operational interface that consumes Supabase via `@supabase/supabase-js`. No frontend business rules override backend validation.

### Module layout (see `src/modules/remocao/`)

```
remocao/
├── container/        # App shell wrapper
├── context/          # RemocaoContext (state + realtime)
├── routes/           # Route declarations
├── permissions/      # Permission constants + gate
├── types/            # Zod-validated domain types
├── repositories/     # Supabase data access
├── services/         # Business logic / orchestration
├── hooks/            # Real-time subscriptions, GPS
├── components/       # Shared visual components
├── forms/            # Form schemas + components
├── pages/            # Top-level pages
├── dashboards/       # Dashboards & KPI cards
├── alerts/           # Visual + audio alert engine
├── checklist/        # Default templates + logic
├── vehicle/
├── team/
├── intercurrences/
├── audit/
└── tests/
```

### Supabase backend

Migrations live in `supabase/migrations/`. Apply order:
1. `20261008000000_remocao_enums.sql` — enum types
2. `20261008000001_remocao_core.sql` — core tables
3. `20261008000002_process_tables.sql` — clinical, checklist, docs
4. `20261008000003_remocao_rls.sql` — RLS + policies
5. `20261008000004_functions.sql` — functions, storage
6. `20261008000005_views.sql` — computed views + indexes

### Naming conventions
- Tables: `remocao_<entity>`
- Views: `remocao_<entity>_<purpose>`
- Enums: `remocao_<domain>_<value>`
- Frontend: modular, context + repository + hooks pattern
- Permissions: `remocao.<entity>.<action>` (e.g. `remocao.remocao.create`)

### State machine (section 13)
Status transitions are enforced by `validar_transicao_status()` in the database.
Frontend must call `update_remocao_status()` RPC, never write `status` directly.

### Security
- RLS is enabled on ALL tables.
- `remocao_auditoria` and `remocao_status_historico` are immutable (no UPDATE policy).
- Storage bucket `remocao-documentos` is private.
- No frontend rule replaces medical/clinical decision-making.
