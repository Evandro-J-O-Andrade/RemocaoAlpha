// Centralized RBAC utilities for RemocaoAlpha
// Roles are defined in Supabase (migration 010). Frontend must not override backend.

export type CanonicalRole =
  | 'admin_master'
  | 'admin_gestao'
  | 'suporte_ti'
  | 'suporte_master'
  | 'suporte'

export const CANONICAL_ROLES: Record<CanonicalRole, { nome: string; nivel: number; descricao: string }> = {
  admin_master: { nome: 'Super Administrador (ROOT)', nivel: 1000, descricao: 'Proprietário do sistema. Acesso administrativo global.' },
  admin_gestao: { nome: 'Administrador de Gestão', nivel: 100, descricao: 'Administração operacional e gerencial dentro da organização.' },
  suporte_ti: { nome: 'Suporte Técnico (TI)', nivel: 70, descricao: 'Diagnóstico, monitoramento, logs e manutenção técnica.' },
  suporte_master: { nome: 'Supervisor de Suporte', nivel: 75, descricao: 'Gestão de chamados e coordenação da equipe de suporte.' },
  suporte: { nome: 'Suporte (1º Nível)', nivel: 60, descricao: 'Atendimento de primeira linha.' },
}

export function isRootRole(role: string): boolean {
  return role === 'admin_master'
}

export function hasEffectivePermission(
  permissions: string[],
  isRoot: boolean,
  required: string | string[]
): boolean {
  if (isRoot) return true
  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.every((p) => permissions.includes(p))
}
