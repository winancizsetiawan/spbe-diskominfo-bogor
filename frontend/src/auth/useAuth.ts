import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { toast } from '@/components/ui/toast'
import { authAdapter } from './adapter'
import { can, type Permission } from './permissions'
import { useSession } from './session'
import { ROLE_LABEL, type Role, type User } from './types'

export function useAuth() {
  const { status, user, notice, setUser } = useSession()
  const qc = useQueryClient()

  const switchRole = async (nextRole: Role) => {
    if (!user || user.role === nextRole) return
    try {
      const res = await api<{ role: Role; user: User }>('/auth/switch-role', {
        method: 'POST',
        json: { role: nextRole },
      })
      authAdapter.loginAs?.(res.role, res.user.email)
      setUser(res.user)
      void qc.invalidateQueries()
      toast.success(`Peran aktif berhasil diubah menjadi ${ROLE_LABEL[res.role]}.`)
    } catch {
      // Cadangan bila mode mock / offline
      authAdapter.loginAs?.(nextRole, user.email)
      setUser({ ...user, role: nextRole })
      void qc.invalidateQueries()
      toast.success(`Peran aktif berhasil diubah menjadi ${ROLE_LABEL[nextRole]}.`)
    }
  }

  return {
    status,
    user,
    notice,
    can: (permission: Permission) => can(user, permission),
    login: authAdapter.login,
    logout: authAdapter.logout,
    switchRole,
  }
}
