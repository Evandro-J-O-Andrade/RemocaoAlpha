import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type LoadingState = 'idle' | 'loading' | 'success' | 'error'

interface LoadingContextValue {
  global: LoadingState
  setGlobal: (state: LoadingState) => void
  moduleStates: Record<string, LoadingState>
  setModule: (key: string, state: LoadingState) => void
  isAnyLoading: boolean
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [global, setGlobal] = useState<LoadingState>('idle')
  const [moduleStates, setModuleStates] = useState<Record<string, LoadingState>>({})

  const setModule = (key: string, state: LoadingState) => {
    setModuleStates((prev) => ({ ...prev, [key]: state }))
  }

  const isAnyLoading = global === 'loading' || Object.values(moduleStates).some((s) => s === 'loading')

  const value = useMemo(
    () => ({ global, setGlobal, moduleStates, setModule, isAnyLoading }),
    [global, moduleStates, isAnyLoading]
  )

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <InstitutionalLoader state={global} />
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider')
  return ctx
}

export function useModuleLoading(key: string) {
  const { setModule, moduleStates } = useLoading()
  const state = moduleStates[key] ?? 'idle'
  return {
    state,
    isLoading: state === 'loading',
    start: () => setModule(key, 'loading'),
    succeed: () => setModule(key, 'success'),
    fail: () => setModule(key, 'error'),
    reset: () => setModule(key, 'idle'),
  }
}

function InstitutionalLoader({ state }: { state: LoadingState }) {
  if (state !== 'loading') return null

  return (
    <div className="login-feedback">
      <div className="login-feedback__loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="login-feedback__stage">Carregando</span>
        <span className="login-feedback__message">Aguarde um momento...</span>
        <div className="login-feedback__progress">
          <div className="login-feedback__progress-bar" />
        </div>
      </div>
    </div>
  )
}