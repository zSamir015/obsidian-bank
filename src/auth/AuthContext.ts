import type { Session } from '@/lib/auth'
import { createContext } from 'react'

export interface AuthState {
  session: Session | null
  loading: boolean
}

export const AuthContext = createContext<AuthState>({ session: null, loading: true })
