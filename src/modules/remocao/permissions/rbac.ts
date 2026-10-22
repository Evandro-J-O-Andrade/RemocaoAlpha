// Centralized RBAC utilities for RemocaoAlpha
// Roles are defined in Supabase (migration 010). Frontend must not override backend.

export type CanonicalRole =
  | 'admin_master'
  | 'admin_gestao'
  | 'admin'
  | 'gestor'
  | 'enfermeiro_chefe'
  | 'enfermeiro'
  | 'medico'
  | 'motorista'
  | 'atendente'
  | 'suporte_ti'
  | 'suporte_master'
  | 'suporte'

export const CANONICAL_ROLES: Record<CanonicalRole, { nome: string; nivel: number; descricao: string }> = {
  admin_master: { nome: 'Super Administrador (ROOT)', nivel: 1000, descricao: 'Proprietário do sistema. Acesso administrativo global.' },
  admin_gestao: { nome: 'Administrador de Gestão', nivel: 100, descricao: 'Administração operacional e gerencial dentro da organização.' },
  admin: { nome: 'Administrador', nivel: 100, descricao: 'Administrador de organização cliente.' },
  gestor: { nome: 'Gestor', nivel: 80, descricao: 'Gestor de unidade operacional.' },
  enfermeiro_chefe: { nome: 'Enfermeiro Chefe', nivel: 60, descricao: 'Enfermeiro responsável pela equipe de enfermagem.' },
  enfermeiro: { nome: 'Enfermeiro', nivel: 50, descricao: 'Profissional de enfermagem assistencial.' },
  medico: { nome: 'Médico', nivel: 55, descricao: 'Profissional médico responsável por avaliações clínicas.' },
  motorista: { nome: 'Motorista', nivel: 40, descricao: 'Motorista responsável por execução de remoções.' },
  atendente: { nome: 'Atendente', nivel: 30, descricao: 'Atendente operacional de despacho e solicitações.' },
  suporte_ti: { nome: 'Suporte Técnico (TI)', nivel: 70, descricao: 'Diagnóstico, monitoramento, logs e manutenção técnica.' },
  suporte_master: { nome: 'Supervisor de Suporte', nivel: 75, descricao: 'Gestão de chamados e coordenação da equipe de suporte.' },
  suporte: { nome: 'Suporte (1º Nível)', nivel: 60, descricao: 'Atendimento de primeira linha.' },
}

export function isRootRole(role: string): boolean {
  return role === 'admin_master'
}

/**
 * A list of required permissions is an allow-list: any one grants access.
 * Callers that require every permission must check those permissions separately.
 */
export function hasEffectivePermission(
  permissions: string[],
  isRoot: boolean,
  required: string | string[]
): boolean {
  if (isRoot) return true
  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.some((permission) => permissions.includes(permission))
}
