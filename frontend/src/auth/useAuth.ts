import { authAdapter } from './adapter'
import { can, type Permission } from './permissions'
import { useSession } from './session'

export function useAuth() {
  const { status, user, notice } = useSession()
  return {
    status,
    user,
    notice,
    can: (permission: Permission) => can(user, permission),
    login: authAdapter.login,
    logout: authAdapter.logout,
  }
}
