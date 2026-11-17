import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { toast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { authAdapter, authMode } from './adapter'
import { can, type Permission } from './permissions'
import { useSession } from './session'
import { ROLE_LABEL, type JawabanLogin, type Role } from './types'

export function useAuth() {
  const { status, user, notice, setUser } = useSession()
  const qc = useQueryClient()

  const switchRole = async (nextRole: Role) => {
    if (!user || user.role === nextRole) return
    try {
      const res = await api<JawabanLogin>('/auth/switch-role', {
        method: 'POST',
        json: { role: nextRole },
      })
      // Peran aktif tersimpan di token sesi, jadi BE menerbitkan token baru.
      if (res.token && res.kedaluwarsaPada && authAdapter.loginToken) authAdapter.loginToken(res.token, res.kedaluwarsaPada)
      else authAdapter.loginAs?.(res.role, res.user.email)
      setUser(res.user)
      void qc.invalidateQueries()
      toast.success(`Peran aktif berhasil diubah menjadi ${ROLE_LABEL[res.role]}.`)
    } catch (err) {
      // Cadangan hanya untuk mode demo tanpa BE; di mode lain kegagalan ditampilkan apa adanya.
      if (authMode !== 'mock') {
        toast.error(errorMessage(err))
        return
      }
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
