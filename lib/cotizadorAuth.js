/**
 * Helper para verificar autenticación de cotizadores/vendedores
 */
export async function checkCotizadorAuth() {
  try {
    const res = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    
    if (!res.ok) {
      return { user: null, error: 'Not authenticated' }
    }
    
    const userData = await res.json()
    
    // Verificar que el usuario sea cotizador, vendedor o admin
    const allowedRoles = ['admin', 'superadmin', 'cotizador', 'vendedor']
    if (!allowedRoles.includes(userData.role)) {
      return { user: null, error: 'Not authorized' }
    }
    
    return { user: userData, error: null }
  } catch (error) {
    console.error('Auth error:', error)
    return { user: null, error: 'Auth check failed' }
  }
}
