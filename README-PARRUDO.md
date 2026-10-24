
# REMOCAO ALPHA - SCHEMA PARRUDO ENTERPRISE

Este schema substitui seu remote_schema.sql básico e suporta tudo que você pediu:

## O que mudou do básico pro parrudo:

### Básico que você tinha:
- tabela simples de remoção
- 1 motorista

### Parrudo que agora tem:
- **Multi-tenant**: organizations (Instituto Alpha etc)
- **Unidades**: UBS, Hospital, Clínica Exame Externo com logradouro + lat/lng pra rota
- **Profissionais com TODOS os conselhos**: CPF/RG/CNS únicos pra inner join, CRM/COREN/CREFITO/CRN/CNH/CBO, avatar_url em /AVATAR/
- **Pacientes com chaves únicas**: CPF, RG, CNS, id_externo_cmdpro pra upsert automático do CMDPro, logradouro completo, idade gerada auto, IMC gerado auto
- **Veículos VT vs Ambulância**: USB, USA, Neonatal, VT, categoria gerada auto
- **Remoções com fluxo completo CROSS/SP**: 
  - Status: SOLICITADA, EM_REGULACAO, VAGA_ZERO, VAGA_ZERO_ACEITA, ACEITA, NEGADA, CROSS_SOLICITADA, CROSS_ACEITA, CROSS_NEGADA, DESPACHADA, EM_TRANSITO_ORIGEM, CHEGADA_ORIGEM, PARTIDA_ORIGEM, EM_TRANSITO_DESTINO, CHEGADA_DESTINO, FINALIZADA, EVASAO, CANCELADA, GLOSA
  - 6 FKs de equipe: motorista_id, tecnico_enfermagem_id, enfermeiro_id, medico_id, fisioterapeuta_id, nutricionista_id
  - KM inicial/final/total gerado, tempo_total gerado, SLA por prioridade
  - Campos Vaga Zero, CROSS protocolo, Evasão
  - SIGTAP, CBO, faturamento
  - Agendamento pré-feito (IMEDIATO, AGENDADO, RECORRENTE)
- **Histórico**: remocao_status_history grava automaticamente toda mudança de status com GPS
- **GPS Tracking**: gps_tracking pra n8n rastrear em tempo real
- **Checklists duplos**: checklists tipo MOTORISTA e ENFERMAGEM pra bater fatos, com fotos e assinatura
- **Evoluções**: MEDICA, ENFERMAGEM, FISIOTERAPIA, NUTRICAO, REGULACAO
- **Anexos e Avatares**: pasta /AVATAR/ que você pediu, bucket avatares e remocao-anexos
- **Agendamentos**: recorrentes pra hemodiálise, quimio, etc
- **Triggers**: gera código REM-202510-AB12CD auto, updated_at auto, histórico auto
- **RLS**: motorista só vê suas, central vê tudo da org
- **Views**: vw_remocao_completa com 15 inner joins (o que você pediu), vw_faturamento, vw_kpis_gestao
- **Realtime**: remocoes, gps_tracking, checklists

## Como usar:

1. No Supabase SQL Editor, rode:
```sql
\i supabase/schema-parrudo-enterprise.sql
\i supabase/tabelas/01-sigtap.sql
\i supabase/tabelas/02-cid10.sql
\i supabase/tabelas/03-cbo.sql
```

2. Crie buckets:
- avatares (public)
- remocao-anexos (private)

3. Crie pasta public/AVATAR/ e coloque fotos:
- evandro.jpg
- maria_enfermeira_coren123.jpg
- joao_motorista_cnh.jpg

4. No código, quando logar:
```ts
const { data: profissional } = await supabase
  .from('profissionais')
  .select('*')
  .eq('user_id', user.id)
  .single()

// Já vem com CRM/COREN auto
// Se for motorista, seta equipe:
await supabase.from('remocoes').update({
  tecnico_enfermagem_id: 'uuid-tecnica',
  enfermeiro_id: 'uuid-enfermeira',
  medico_id: 'uuid-medico-se-precisar'
}).eq('id', remocao_id)
```

5. GPS real-time:
```ts
navigator.geolocation.watchPosition(pos => {
  supabase.from('gps_tracking').insert({
    remocao_id,
    profissional_id,
    lat: pos.coords.latitude,
    lng: pos.coords.longitude
  })
})
```

## Diferença do básico pro parrudo em números:
- Básico: 3 tabelas, 1 FK
- Parrudo: 14 tabelas, 25 FKs, 8 índices GIN, 4 triggers, 3 views, RLS por role, Realtime em 4 tabelas
