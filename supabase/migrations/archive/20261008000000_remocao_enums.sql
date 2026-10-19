-- =============================================================================
-- REMOÇÃO MODULE — Core Enums & Lookup Tables
-- =============================================================================

-- Tipo de transporte (classification.clinical_type)
CREATE TYPE remocao_tipo_transporte AS ENUM (
  'simple',       -- Remoção simples/eletiva
  'basico',       -- Suporte básico
  'intermediario',-- Suporte intermediário
  'avancado',     -- Suporte avançado
  'urgente'       -- Emergencial/urgente
);

-- Nível de suporte (aligns with COFEN 713/2022)
CREATE TYPE remocao_nivel_suporte AS ENUM (
  'basico',
  'intermediario',
  'avancado'
);

-- Finalidade da remoção (classification.purpose)
CREATE TYPE remocao_finalidade AS ENUM (
  'exame',
  'procedimento',
  'consulta',
  'transferencia_inter_hospitalar',
  'transferencia_intra_rede',
  'alta_hospitalar',
  'retorno_residencia',
  'retorno_unidade_origem',
  'outro'
);

-- Status da máquina de estados (section 13)
CREATE TYPE remocao_status AS ENUM (
  'SOLICITADA',
  'EM_AVALIACAO',
  'AGUARDANDO_DESTINO',
  'DESTINO_CONFIRMADO',
  'AGUARDANDO_EQUIPE',
  'EQUIPE_CONFIRMADA',
  'AGUARDANDO_MOTORISTA',
  'MOTORISTA_CHECKIN',
  'MOTORISTA_CONFIRMADO',
  'CHECKLIST_PENDENTE',
  'PRONTA_PARA_SAIDA',
  'EM_DESLOCAMENTO',
  'CHEGADA_DESTINO',
  'PACIENTE_ENTREGUE',
  'RETORNANDO',
  'RETORNOU_UNIDADE',
  'ENCERRADA',
  'CANCELADA',
  'SUSPENSA',
  'INTERCORRENCIA',
  'NAO_REALIZADA'
);

-- Prioridade da remoção
CREATE TYPE remocao_prioridade AS ENUM (
  'rotina',
  'urgente',
  'emergencial'
);

-- Necessidade de médico
CREATE TYPE remocao_necessidade_medica AS ENUM (
  'obrigatorio',
  'solicitado',
  'dispensado',
  'nao_disponivel',
  'nao_necessario'
);

-- Condição clínica do paciente (section 5)
CREATE TYPE remocao_condicao_clinica AS ENUM (
  'estavel',
  'instavel',
  'grave',
  'critico',
  'emergencia'
);

-- Tipo de intercorrência (section 17)
CREATE TYPE remocao_tipo_intercorrencia AS ENUM (
  'alteracao_sinais_vitais',
  'queda',
  'deterioracao_clinica',
  'parada_cardiorrespiratoria',
  'falta_equipamento',
  'falha_equipamento',
  'falta_oxigenio',
  'acidente',
  'atraso',
  'problema_destino',
  'recusa_destino',
  'retorno_origem',
  'outro'
);

-- Role do membro de equipe (section 2)
CREATE TYPE remocao_equipe_role AS ENUM (
  'motorista',
  'tecnico_enfermagem',
  'enfermeiro',
  'medico',
  'outro'
);

-- Tipo de veículo
CREATE TYPE remocao_tipo_veiculo AS ENUM (
  'ambulancia_a',
  'ambulancia_b',
  'ambulancia_c',
  'ambulancia_d',
  'veiculo_especial',
  'outro'
);

-- Situação do veículo
CREATE TYPE remocao_situacao_veiculo AS ENUM (
  'disponivel',
  'ocupado',
  'em_manutencao',
  'indisponivel'
);

-- Status de documento (section 27 docs)
CREATE TYPE remocao_documento_status AS ENUM (
  'UPLOADED',
  'PROCESSING',
  'EXTRACTED',
  'PENDING_REVIEW',
  'REVIEWING',
  'APPROVED',
  'IMPORTED',
  'REJECTED',
  'FAILED'
);

-- Tipo de documento
CREATE TYPE remocao_documento_tipo AS ENUM (
  'relatorio_medico',
  'documento_transferencia',
  'autorizacao_transferencia',
  'pedido_exame',
  'resultado_exame',
  'prescricao',
  'documento_administrativo',
  'outro'
);

-- Disponibilidade do motorista
CREATE TYPE remocao_motorista_status AS ENUM (
  'disponivel',
  'ocupado',
  'em_deslocamento',
  'em_retorno',
  'indisponivel'
);

-- =============================================================================
-- Core lookup tables
-- =============================================================================

-- Table: remocao_tabela_referencia (lookup values for configurable items)
create table if not exists remocao_tabela_referencia (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references auth.users not null,
  codigo text not null,
  nome text not null,
  descricao text,
  tipo text not null, -- 'condicao_clinica', 'precaucao', 'necessidade', etc.
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, codigo, tipo)
);

-- Table: remocao_unidade (hospital unit / service)
-- This may reference an existing unit table in the HIS; if so, replace the FK.
create table if not exists remocao_unidade (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references auth.users not null,
  codigo text not null,
  nome text not null,
  tipo text, -- 'hospital', 'clinica', 'centro_diagnostico', 'residencia'
  endereco text,
  telefone text,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, codigo)
);

-- Table: remocao_setor (sector within a unit: enfermaria, UTIC, etc.)
create table if not exists remocao_setor (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references auth.users not null,
  unidade_id uuid references remocao_unidade not null,
  codigo text not null,
  nome text not null,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, unidade_id, codigo)
);
