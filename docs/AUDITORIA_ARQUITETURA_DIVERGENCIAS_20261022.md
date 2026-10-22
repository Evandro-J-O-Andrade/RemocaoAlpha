# Auditoria de arquitetura e divergências — Remoção Alpha

- **Data:** 2026-10-22
- **Branch auditada:** `feat/saas-ui-foundation`
- **Snapshot do código:** `4734ea3728a3de038f2e0afc776041b216d98415`
- **Objetivo:** registrar o fluxo real de identidade, tenant/unidade, permissões, navegação, formulários, slugs, acesso a dados e persistência antes de nova refatoração.
- **Tipo:** auditoria estática do repositório. Não equivale a teste de execução, pentest, nem validação do banco remoto.
- **Regra de evidência:** “Confirmado no código” significa que o comportamento está visível no snapshot; não prova que a política remota ou o dado de produção esteja correto.

## 1. Resumo executivo

O projeto já tem componentes importantes — Supabase Auth, contexto de identidade, RPCs de permissões, guardas de rota, repositório, serviços, React Query, migrations e testes de segurança. Porém, ainda não há um contrato único e integralmente seguido da fonte de dados até a interface. Há responsabilidades duplicadas, pontos que usam tenant ID como filtro no frontend além de RLS, formulários com estilos utilitários heterogêneos e rotas que não evidenciam suporte a mini landing pages por slug.

**Prioridades antes de refatorar:**
1. P0 — comprovar identidade/contexto ativo e escopo tenant/unidade com a sessão real, sem fallback ambíguo.
2. P0 — conferir permissões efetivas e chaves do catálogo entre migrations, `Perm`, AdminManagementPage, menu e rotas.
3. P0 — revisar mutações operacionais para não avançar estado quando uma gravação falha e não registrar coordenadas fictícias.
4. P1 — definir um contrato de formulários e de mini landing pages por slug, incluindo CSS e comportamento responsivo.
5. P1 — centralizar leitura/escrita por repositories/services e uniformizar loading, erro, retry, paginação e invalidação de cache.
6. P1 — regenerar/validar os tipos Supabase contra o esquema realmente aplicado.
7. P2 — consolidar navegação e módulos em um único registro, mantendo a autorização efetiva no backend.

## 2. Fonte da verdade: identidade e contexto

### Fluxo encontrado

`supabase.auth` fornece a sessão. `AuthProvider.tsx` consulta `people`, `tenant_memberships`, `get_current_tenant_info()`, `is_admin_master()` e `get_user_permissions()`, e monta `AuthUser`. `RequireAuth` controla sessão e troca obrigatória de senha; `RequirePermission` controla a navegação no frontend. As páginas e repositórios usam `user.tenant_id` como contexto de consulta; RLS/RPCs precisam continuar sendo a barreira real de segurança.

### Divergências/risco

- **ID-01 — Identidade não é falha-fechada em todas as leituras.** Em `AuthProvider.tsx`, erros na consulta de `people` e `tenant_memberships` não são imediatamente convertidos em erro de resolução; o fluxo pode continuar com dados vazios. É necessário distinguir “sem registro” de “falha ao consultar”.
- **ID-02 — Campos duplicados no contrato.** `AuthUser` mantém `activeTenant` e também campos legados `tenant_id`, `tenant_nome`, `papel`. Isso permite divergência entre representações do mesmo contexto se a montagem não for atômica.
- **ID-03 — Contexto de tenant/unidade.** O frontend trabalha principalmente com `tenant_id`; a existência de `remocao_unidade`/setores não demonstra, por si só, que toda autorização operacional está delimitada à unidade ativa. É necessário mapear a unidade autorizada por membership/atribuição e provar RLS por tabela.
- **ID-04 — Multi-vínculo.** `AuthUser` contém `memberships` e existe `OrganizationSwitcher`, mas a resolução do tenant atual depende de RPC. Verificar que troca de contexto atualiza o estado local, cache, subscriptions e consultas; não inferir tenant a partir de `memberships[0]`.
- **ID-05 — E-mail e nome.** O e-mail de Auth e o nome em `people` vêm de fontes distintas; o contrato deve definir precedência, tratamento de divergência e nome ausente.
- **Senha.** Correto manter a senha sob Supabase Auth: nunca consultar, persistir ou renderizar senha em texto puro. `password_reset_required` é estado de fluxo, não permissão operacional.

**Validação remota pendente:** o conector disponível nesta auditoria não tem acesso ao projeto Supabase Remoção Alpha. Não foi possível verificar o estado aplicado das migrations, políticas RLS, funções ou registros de produção.

## 3. RBAC, catálogo de permissões e rotas

### Fluxo encontrado

- Catálogo de chaves do frontend: `src/modules/remocao/permissions/index.ts`.
- Comparação para UI: `hasEffectivePermission()` em `rbac.ts`; uma lista de permissões exigidas usa semântica **ANY** (`.some()`).
- Guards: `RequireAuth` e `RequirePermission`.
- Menu: regras locais em `AuthLayout.tsx`.
- Página administrativa: `AdminManagementPage.tsx`.
- Autorização efetiva de dados/ações depende de RPCs, funções e RLS no Supabase.

### Divergências/risco

- **RBAC-01 — Fontes de permissão duplicadas.** Menu, rotas e página administrativa mantêm regras separadas. Podem divergir na visibilidade de um módulo; esconder item de menu não protege URL nem ação.
- **RBAC-02 — Semântica ANY/ALL.** Arrays passados ao guard liberam acesso com qualquer permissão listada. Isso é válido para alternativas, mas inadequado se uma rota exigir todas as permissões. Cada chamada deve documentar qual semântica pretende.
- **RBAC-03 — Chaves do catálogo precisam de reconciliação.** O inventário anterior `docs/P1.1-inventario-rbac.md` registra divergências de prefixo entre `Perm`, migrations e `AdminManagementPage`. O código atual foi parcialmente ajustado, mas ainda é necessário comparar **todas** as chaves e funções seed com o catálogo efetivamente aplicado; não declarar a reconciliação concluída só pelo frontend.
- **RBAC-04 — ROOT no cliente.** O cliente trata `is_root` como bypass para exibição/guardas. Isso só é aceitável como UX se o servidor validar ROOT independentemente em cada RPC/policy; nunca usar o booleano do browser como autorização de backend.
- **RBAC-05 — Guardas de ação.** Conferir que cada mutação de status, equipe, veículo, documentos, checklist, GPS, intercorrência e gestão administrativa tem checagem server-side correspondente e escopo de registro.
- **RBAC-06 — Rotas sem permissão explícita.** `/account` exige autenticação, mas não permissão de catálogo; decidir e documentar se é área pessoal universal ou capability específica.

## 4. Rotas, slugs e mini landing pages

### Rotas encontradas em `AppRoutes.tsx`

- Públicas: `/login`, `/loading`, `/error`, `/fallback`, `/rollback`.
- Autenticada: `/change-password`.
- Protegidas: `/`, `/nova-remocao`, `/remocao/:id`, `/driver/:id`, `/admin`, `/relatorios/*`, `/dashboard-analitico`, `/account`.
- O fallback `*` redireciona para `/`.

### Divergências/risco

- **SLUG-01 — Não foi encontrada rota explícita por slug.** A rota `/remocao/:id` trata o parâmetro como ID da remoção; a página consulta por `id` UUID e tenant. Não há no roteador atual evidência de rota dedicada a landing page pública por slug. Se os slugs já existem no banco, o mapeamento slug → página/formulário não aparece nesta superfície do código auditada.
- **SLUG-02 — Confusão entre detalhe operacional e landing page.** `/remocao/:id` está dentro do layout autenticado e exige permissão `REMOCACAO_VISUALIZAR`; portanto não serve como página pública de solicitação por slug sem uma rota e política de acesso distintas.
- **SLUG-03 — Fallback mascara rota inexistente.** Redirecionar qualquer URL desconhecida para `/` dificulta identificar slugs inválidos e pode mostrar erro de autorização em vez de um 404 próprio.
- **SLUG-04 — CSS dos formulários.** Os formulários usam classes utilitárias e markup heterogêneo; o CSS de módulo é importado globalmente em `App.tsx`, mas vários estilos dependem de wrappers como `.remocao-module`. Formulário renderizado fora desse wrapper pode perder o contrato visual. O ajuste CSS no commit auditado adicionou uma base genérica dentro de `.remocao-module`, mas ainda precisa de teste visual em cada formulário/slug e em claro/escuro.
- **SLUG-05 — Modelo de conteúdo não comprovado.** Não foi encontrado nesta auditoria um registro único que mapeie slug, formulário, campos, tenant/unidade, status, tema, política de publicação e ações. Confirmar o schema real antes de propor tabela ou modelo novo.

**Decisão antes de implementar:** inventariar no banco real as tabelas/colunas de slug e formulários e relacioná-las às rotas. Não criar schema novo nem assumir que slug é público até essa verificação.

## 5. Acesso a dados: repositórios, serviços e hooks

### Fluxo encontrado

- `RemocaoRepository` concentra parte das consultas à tabela `remocao`, views de dashboard, resumo, detalhes e operações relacionadas.
- `RemocaoService` contém regras de transição/segurança e orquestra chamadas do repositório.
- `useRemocoes.ts` usa React Query, com query keys por tenant e funções de consulta.
- `RemocaoContext.tsx` mantém filtros locais e integra hooks/subscriptions.
- Algumas páginas ainda consultam Supabase diretamente.

### Divergências/risco

- **DATA-01 — Acesso direto em páginas/componentes.** `RemocaoDetailPage.tsx` e `DriverInterface.tsx` fazem consultas Supabase diretas, além de chamadas ao repository/service. Isso fragmenta tratamento de erro, tipagem, escopo e invalidação de cache.
- **DATA-02 — Consultas duplicadas.** A tela de detalhe consulta `remocao_dashboard` diretamente e também carrega motoristas/veículos via repository; a interface do motorista faz queries próprias para motorista/veículo. Definir contratos comuns e query keys.
- **DATA-03 — Query keys incompletas.** A chave de detalhe identificada é `['remocao','detail', id]`, sem tenant/contexto. Mesmo que IDs sejam UUID, a troca de tenant e cache precisam ser tratados explicitamente.
- **DATA-04 — Erros descartados.** Algumas consultas fazem destructuring de `data` sem apresentar `error`; isso pode transformar falha de rede/RLS em estado vazio ou carregamento que termina sem explicação.
- **DATA-05 — Filtros de busca.** O filtro de pesquisa é interpolado em expressão PostgREST `.or(...ilike...)`; revisar escaping de caracteres especiais e manter paginação/limites no servidor.
- **DATA-06 — Tipos manuais.** `src/lib/supabase/types.ts` contém tipos escritos/versionados manualmente. Comparar com o schema aplicado e gerar tipos de fonte real para evitar drift.
- **DATA-07 — Consistência das mutações.** As telas chamam ações e depois fazem `window.location.reload()`. Isso perde estado, dificulta feedback e não invalida cache de forma controlada.
- **DATA-08 — Falha parcial.** Há fluxos que fazem uma gravação e depois tentam outra (por exemplo, registro operacional + transição de status). Se a primeira ou segunda falhar, o estado pode ficar parcialmente persistido. Usar RPC transacional para operações que precisam ser atômicas, se confirmado no domínio.
- **DATA-09 — Tenant ID no frontend.** Filtrar por `user.tenant_id` ajuda na consulta e UX, mas não é a fronteira de segurança. Cada SELECT/INSERT/UPDATE/DELETE e storage precisa de RLS/policy/RPC que derive e valide o contexto no servidor.

## 6. Fluxos operacionais e integridade

- **OPS-01 — Coordenadas substitutas.** `DriverInterface.tsx` grava `0` quando a posição atual ainda não está disponível (`position?.coords.latitude || 0`, longitude equivalente). Isso pode criar um registro geográfico falso (0,0), contrariando o princípio de GPS como evidência. Não enviar coordenadas se não houver posição válida; registrar estado/erro explicitamente.
- **OPS-02 — Resultado de gravação não sempre verificado.** Alguns handlers chamam serviço, transição e reload sem validar cada `result.error`. O usuário pode ver sucesso aparente mesmo com falha de persistência.
- **OPS-03 — Identidade de auditoria.** `ChecklistForm.tsx` usa literal `'current-user'` para `checked_by`; isso não é um UUID de identidade confiável. Deve usar identidade autenticada ou deixar a atribuição para trigger/RPC server-side.
- **OPS-04 — Checklist duplicado/concorrência.** O componente pode montar itens padrão no estado local quando não há linhas; a criação do checklist também é responsabilidade de trigger/migration. Confirmar idempotência e garantir que UI não simule persistência antes de o banco confirmar.
- **OPS-05 — Máquina de estados.** Existe `StatusMachine` e `SafetyGuard`, mas a regra de transição no cliente não basta. Garantir que a transição e pré-condições críticas sejam aplicadas atomicamente no backend.
- **OPS-06 — Dados clínicos.** Campos como diagnóstico, alergias, precauções, prontuário e anexos são sensíveis. Auditar minimização, escopo por tenant/unidade, logs, storage e retenção LGPD antes de ampliar o acesso.
- **OPS-07 — Nomes/cargos e IDs livres.** Revisar mutações que recebem `profissional_nome`, `profissional_id`, `usuarioId` ou `tenantId` do cliente. Identidade e escopo de auditoria devem ser derivados/verificados no servidor.

## 7. CSS, design system e formulários

### Evidência

- `src/main.tsx` importa `src/index.css`.
- `src/App.tsx` importa `src/modules/remocao/remocao.css` globalmente.
- O projeto tem ainda `src/styles/global.css`, `reset.css` e `tokens.css`, mas não foi confirmado que sejam importados no caminho ativo.
- `SolicitacaoRemocaoForm`, `DriverCheckinCheckoutForm`, `IntercorrenciaForm`, `AvaliacaoClinicaForm` e `ChecklistForm` usam padrões/classes diferentes.
- O CSS mais recente define uma base de controles para forms descendentes de `.remocao-module`.

### Divergências/risco

- **CSS-01 — Múltiplas fontes de tokens.** `index.css` declara `--background/--foreground/--primary`; `remocao.css` declara `--rem-bg/--rem-text/--rem-primary`; `styles/tokens.css` define outro conjunto. Confirmar se os estilos não importados são legado ou parte pretendida do sistema antes de remover qualquer arquivo.
- **CSS-02 — Utilitários e CSS customizado misturados.** Algumas páginas dependem de Tailwind v4 e outras de classes `remocao-*`; estilos globais como `button, a, input, select, textarea { transition: all ... }` podem competir com microinterações mais específicas.
- **CSS-03 — Escopo de formulário dependente de wrapper.** A regra nova cobre apenas `.remocao-module form`; formulários fora desse wrapper não recebem a mesma base.
- **CSS-04 — Tema.** Tokens de tema claro/escuro existem em mais de um conjunto. Validar contraste, estados disabled/error/focus, selects nativos e mensagens de validação em ambos os temas.
- **CSS-05 — Slugs não testados.** `landingPages.test.tsx` testa páginas de erro/loading/feedback e `StatePage`; o arquivo não testa slugs reais, aparência de controles ou submissão de mini landing pages.
- **CSS-06 — CSS de formulário não é validação funcional.** Estilo não corrige validação, upload, persistência, autorização nem acessibilidade dos rótulos.

## 8. Testes e qualidade

Scripts disponíveis em `package.json`: `dev`, `build` (TypeScript + Vite), `lint` (oxlint) e `preview`. Não há script `test` visível nesse `package.json`, embora existam testes Vitest em `src/modules/remocao/tests`.

- **QA-01 — Testes não executados nesta auditoria.** O acesso atual é por GitHub MCP; não foi executado checkout local, Vitest, TypeScript, lint, build nem browser.
- **QA-02 — Integração de testes.** Confirmar como Vitest é invocado no CI e acrescentar script explícito caso esteja ausente.
- **QA-03 — Cobertura por comportamento.** Existem testes de IDOR, RBAC, login e fluxos, mas é necessário conferir se cobrem RLS real, erro de RPC, troca de tenant, slug público/privado, forms, uploads e falhas parciais.
- **QA-04 — Smoke tests de rota.** Adicionar verificação explícita para 404, rota de slug válida/inválida, sessão expirada, usuário sem tenant, múltiplos memberships e troca de unidade.

## 9. Migrations e banco

- O repositório contém migrations de identidade, RBAC, domínio operacional, views, storage e correções de contexto.
- Os arquivos `20261022000000_fix_active_tenant_context.sql`, `20261023000000_fix_create_default_checklist.sql` e posteriores incluem cabeçalho **DRAFT** e exigem autorização explícita antes de aplicar. A data no nome do arquivo não comprova aplicação remota.
- **DB-01 — Estado aplicado não verificado nesta execução.** A conexão disponível não permitiu ler o projeto Remoção Alpha. Não inferir que migration no Git esteja aplicada no Supabase.
- **DB-02 — Drift schema/tipos/seeds.** Comparar migrations, `remote_schema.sql`, `supabase/seed.sql`, scripts de desenvolvimento e esquema remoto; distinguir seed de desenvolvimento de dados reais.
- **DB-03 — Funções críticas.** Validar em sessão autenticada real as funções que dependem de `auth.uid()`, em especial resolução de tenant, permissões, troca de contexto e criação/transição de remoção. Não testar resultado de `auth.uid()` usando service role como se fosse o usuário final.

## 10. Plano de correção proposto (sem executar ainda)

1. **Fase A — Evidência do banco:** inventário read-only de tabelas, colunas, constraints, views, triggers, RPCs, grants e policies realmente aplicadas; reconciliar migrations pendentes.
2. **Fase B — Contrato de identidade/contexto:** uma única resolução validada de pessoa, e-mail, membership, tenant ativo, unidade/escopo, roles, permissions e estado de troca obrigatória de senha; erro explícito quando qualquer parte crítica falhar.
3. **Fase C — Catálogo de capacidades:** comparar cada chave de permissão de frontend com o catálogo real e cada ação com RLS/RPC. Registrar semântica ANY/ALL.
4. **Fase D — Dados:** concentrar consultas/mutações em repositories/services tipados, padronizar erro, paginação, query keys, cache e invalidation; não usar reload como mecanismo de consistência.
5. **Fase E — Operação segura:** coordenadas válidas, auditoria com IDs reais, mutações críticas atômicas, prevenção de sucesso aparente e controle de falha parcial.
6. **Fase F — Mini landing pages/slugs:** localizar o schema real e os registros; documentar slug → tenant/unidade → formulário/campos → publicação/acesso → persistência; separar claramente página pública de detalhe operacional autenticado.
7. **Fase G — Design system:** consolidar tokens ativos, wrappers de formulário e estados; testar todos os forms e slugs em desktop/mobile, tema claro/escuro, foco, erro, disabled e loading.
8. **Fase H — Validação:** Vitest, TypeScript, lint, build, smoke tests, testes de autorização e revisão do diff antes de cada commit.

## 11. Critérios de conclusão

- Nenhuma divergência classificada como P0 sem decisão explícita ou correção validada.
- Cada chave de permissão e ação mapeada a regra real no backend.
- Tenant e unidade ativos derivados/validados no servidor; nenhuma seleção silenciosa do primeiro vínculo.
- Nenhum registro operacional é declarado concluído quando alguma mutação crítica falha.
- Nenhuma coordenada fictícia nem identidade de auditoria placeholder.
- Slugs demonstrados por dados reais e rotas intencionais, com política pública/privada explícita.
- Formulários consistentes e acessíveis em desktop/mobile e tema claro/escuro.
- Testes, TypeScript, lint e build executados; resultado e limitações registrados.
- Nenhuma migration remota aplicada sem autorização explícita.
