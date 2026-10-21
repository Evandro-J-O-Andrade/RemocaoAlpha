import { describe, expect, it } from 'vitest'
import { Perm } from '@/modules/remocao/permissions'

describe('Admin RBAC permission keys', () => {
  it('matches the keys seeded by the Supabase migrations', () => {
    expect(Perm.ADMIN_TENANT_MANAGE).toBe('admin.tenant.manage')
    expect(Perm.ADMIN_USERS_MANAGE).toBe('admin.users.manage')
    expect(Perm.ADMIN_USERS_APPROVE).toBe('admin.users.approve')
    expect(Perm.ADMIN_USERS_ASSIGN_ROLE).toBe('admin.users.assign_role')
    expect(Perm.ADMIN_USERS_INVITE).toBe('admin.tenant.invite_user')
    expect(Perm.ADMIN_ROLES_MANAGE).toBe('admin.roles.manage')
    expect(Perm.SUPPORT_TICKETS_MANAGE).toBe('support.tickets.manage')
    expect(Perm.SUPPORT_TICKETS_READ).toBe('support.tickets.read')
    expect(Perm.SUPPORT_LOGS_READ).toBe('support.logs.read')
    expect(Perm.SUPPORT_DIAGNOSTICS_READ).toBe('support.diagnostics.read')
    expect(Perm.SUPPORT_USERS_READ).toBe('support.users.read')
  })
})
