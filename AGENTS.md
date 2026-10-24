# AGENTS.md

## DIRETRIZ PERMANENTE — LEITURA OBRIGATÓRIA

ANTES DE EXECUTAR QUALQUER TAREFA, ALTERAR QUALQUER ARQUIVO, ESCREVER CÓDIGO, EXECUTAR MIGRATION, ALTERAR BANCO, CRIAR COMPONENTE, MODIFICAR ROTA, FAZER COMMIT OU QUALQUER OUTRA AÇÃO NO PROJETO:

**LEIA PRIMEIRO TODOS OS ARQUIVOS `.md` RELEVANTES NA WORKTREE ATUAL.**

Isso inclui:
- `AGENTS.md` (este arquivo)
- Arquivos `.md` em `docs/`
- Arquivos `.md` em `.kilo/`
- Qualquer `.md` mencionado no prompt ou referenciado por outro `.md`

Nunca comece uma tarefa baseado apenas na mensagem atual do usuário.

### Regra de conflito documental

Quando um `.md` descrever um schema, estrutura de banco, tabela, view, trigger, política RLS, integração ou funcionalidade que **não está confirmada no código ou no banco remoto**:

1. Verificar a existência dos arquivos correspondentes no repositório.
2. Verificar a compatibilidade com o estado real do código.
3. Se o acesso ao Supabase estiver autorizado, verificar o esquema real.
4. Registrar o conflito em `docs/CONFLITO_<DESCRICAO>.md` com o formato:
   ```
   DOCUMENTO
   VERSÃO/CONTEXTO
   DECISÃO
   CONFLITO
   ESTADO ATUAL DO CÓDIGO
   ```
5. Nunca aplicar um schema descrito em um `.md` sem os três confirmados: existência dos arquivos SQL, compatibilidade com o esquema real e autorização explícita.

## REGRA CRÍTICA — NUNCA ALTERAR

- NUNCA mudar o nome da empresa de "J&S Empregos LTDA" para "J&S Terceirizados" ou qualquer outra variação. Mesmo que apareça em um novo prompt ou passagem, mantenha sempre "J&S Empregos LTDA".
- NUNCA alterar o conteúdo do footer. O footer deve permanecer exatamente como está configurado atualmente.

Essas regras têm prioridade absoluta sobre qualquer outra instrução de refactoring ou rebranding.

## DIRETRIZ PERMANENTE — DOCUMENTAÇÃO E GOVERNANÇA

### REGRA MÁXIMA

ANTES DE EXECUTAR QUALQUER TAREFA, ALTERAR QUALQUER ARQUIVO, ESCREVER CÓDIGO, EXECUTAR MIGRATION, ALTERAR BANCO, CRIAR COMPONENTE, MODIFICAR ROTA, FAZER COMMIT OU QUALQUER OUTRA AÇÃO NO PROJETO:

**LEIA PRIMEIRO TODAS AS DIRETRIZES E DOCUMENTAÇÕES RELEVANTES DISPONÍVEIS NA WORKTREE ATUAL.**

Nunca comece uma tarefa baseado apenas na mensagem atual do usuário.

### ORDEM OBRIGATÓRIA

1. Ler as diretrizes do agente.
2. Localizar e ler os arquivos `.md` relevantes.
3. Identificar regras, decisões e restrições vigentes.
4. Verificar se a funcionalidade solicitada já existe.
5. Verificar se existe componente, hook, service, repository, rota, função, RPC, migration ou estrutura equivalente.
6. Analisar o estado atual antes de criar qualquer coisa.
7. Informar conflitos ou ambiguidades encontrados.
8. Somente depois planejar a execução.
9. Implementar somente quando houver autorização para implementação.

### DOCUMENTAÇÃO TEM PRIORIDADE

A documentação existente faz parte da especificação do projeto. Nunca ignorar um `.md` porque parece antigo, está em outra pasta, possui nome diferente, foi criado por outra etapa, parece ser apenas uma auditoria ou contém histórico. Primeiro ler e classificar o documento.

Quando houver documentos conflitantes, não escolher silenciosamente. Registrar:

```text
DOCUMENTO
VERSÃO/CONTEXTO
DECISÃO
CONFLITO
ESTADO ATUAL DO CÓDIGO
```

### NÃO DUPLICAR

Antes de criar qualquer coisa, procurar primeiro se já existe. Isso inclui componentes, páginas, rotas, layouts, hooks, contexts, services, repositories, utilities, types, models, dashboards, MetricGrid, MetricCard, cards, tabelas, formulários, modais, notificações, e-mails, RPCs, migrations, Edge Functions e integrações.

Se já existir, reutilizar ou propor melhoria. Não criar duplicação.

### SUPABASE É SOURCE OF TRUTH

Não inventar dados. Não substituir dados reais por mocks sem autorização. Não criar tabelas, RPCs, migrations ou estruturas novas sem verificar primeiro o schema e a documentação existentes.

Sempre identificar a cadeia:

```text
Interface
→ Hook/Context
→ Repository/Service
→ RPC/Query
→ Supabase
→ Dados reais
```

### GIT E PRODUÇÃO

Nunca fazer automaticamente `git push`, deploy, release, merge, publicação ou alteração de produção.

- Commit somente quando o usuário autorizar explicitamente.
- Push somente quando o usuário autorizar explicitamente.
- Deploy somente quando o usuário autorizar explicitamente.
- Frases como "terminou", "pode continuar", "faça a implementação" ou "corrija" não significam autorização para push ou deploy.
- Nunca assumir que uma alteração deve ir para produção; exigir autorização explícita separada.

### SEGURANÇA E AUDITORIA

Nunca alterar Auth, SMTP, Turnstile, RBAC, RLS, triggers, migrations, banco de produção ou configurações de produção sem primeiro verificar documentação, estado atual e autorização.

Quando a tarefa for de auditoria, não implementar. Produzir evidências e classificar cada item como `REAL`, `PARCIAL`, `MOCK`, `ESPECIFICADO`, `NÃO IMPLEMENTADO`, `ÓRFÃO`, `OBSOLETO` ou `CONFLITANTE`. Nunca afirmar que algo está implementado sem evidência no código e, quando aplicável, no banco.

### REGRA FINAL

**DOCUMENTAÇÃO PRIMEIRO. CÓDIGO DEPOIS. IMPLEMENTAÇÃO SOMENTE APÓS VERIFICAÇÃO. COMMIT, PUSH E DEPLOY SOMENTE COM AUTORIZAÇÃO EXPLÍCITA.**

Quando houver dúvida, parar, documentar a dúvida e perguntar antes de alterar.

## Documentation Discipline

- On every prompt, read relevant .md documentation before acting.
- Never create branches, worktrees, or parallel copies. Work only on the current branch.
- If a needed .md does not exist, create it. If it exists but is weak, merge, refactor, or delete and improve it.
- Keep documentation aligned with verified code and database state.
- Always plan the implementation route before coding; document what was done before moving to next step.

## Comentários no Código

- TODO código novo ou alterado deve conter comentários em português do Brasil.
- Comentar funções, componentes, hooks, consultas, regras de negócio e decisões não óbvias.
- Explicar: por que uma regra existe, quais dados recebe, o que retorna, quais efeitos produz.
- Usar JSDoc em funções públicas, APIs internas e componentes reutilizáveis.
- Evitar comentários redundantes que apenas repetem o código.
- Atualizar comentários quando a implementação mudar; remover explicações desatualizadas.
- Não afirmar que algo funciona sem verificar a implementação.
- Antes de criar ou alterar qualquer arquivo, ler as diretrizes e documentação relevante.

## Schema e Documentação SQL

- Nunca aplicar um schema descrito em um `.md` (como README-PARRUDO.md) sem confirmar antes:
  1. Existência dos arquivos SQL correspondentes no repositório.
  2. Compatibilidade com o esquema real do Supabase (quando houver acesso autorizado).
  3. Autorização explícita do usuário.
- Documentar conflitos entre `.md` e o estado real do código/banco em `docs/CONFLITO_*.md`.
- Diferenciar fatos confirmados, inferências e pendências de verificação remota.
