import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar autenticación inmediatamente
    checkAuth()
    
    // También verificar después de un pequeño delay (por si la cookie aún no está disponible)
    const timeoutId = setTimeout(() => {
      checkAuth()
    }, 1000)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (res.ok) {
        const userData = await res.json()
        console.log('AuthContext: User authenticated', userData)
        setUser(userData)
      } else {
        console.log('AuthContext: Not authenticated', res.status)
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = (userData) => {
    // Actualizar el estado inmediatamente
    setUser(userData)
    // No recargar aquí, dejar que la redirección lo haga
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      // Redirigir siempre a la página principal al cerrar sesión
      window.location.href = '/'
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  // Cerrar sesión automáticamente tras 5 minutos de inactividad
  useEffect(() => {
    if (!user) return

    let idleTimer
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000 // 5 minutos

    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        console.log('AuthContext: Sesión cerrada por inactividad')
        logout()
      }, INACTIVITY_LIMIT_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetTimer))

    // Iniciar el temporizador cuando el usuario está autenticado
    resetTimer()

    return () => {
      if (idleTimer) clearTimeout(idleTimer)
      events.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [user, logout])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        checkAuth,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

