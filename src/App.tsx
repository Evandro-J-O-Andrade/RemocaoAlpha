import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { RemocaoProvider } from '@/modules/remocao/context/RemocaoContext'
import { LoadingProvider } from '@/modules/remocao/components/LoadingProvider'
import '@/modules/remocao/remocao.css'
import { AppRoutes } from '@/app/routes/AppRoutes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <LoadingProvider>
              <RemocaoProvider>
                <AppRoutes />
              </RemocaoProvider>
            </LoadingProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App