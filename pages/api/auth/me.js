import { getCurrentUser } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Log para debugging
    console.log('Auth me - Request headers:', req.headers)
    console.log('Auth me - Cookies object:', req.cookies)
    console.log('Auth me - Cookie header:', req.headers.cookie)
    console.log('Auth me - Token from cookies:', req.cookies?.token)
    
    // Intentar leer la cookie manualmente del header si no está en req.cookies
    let token = req.cookies?.token
    if (!token && req.headers.cookie) {
      const cookieString = req.headers.cookie
      const match = cookieString.match(/token=([^;]+)/)
      if (match) {
        token = match[1]
        console.log('Auth me - Token found in header:', token.substring(0, 20) + '...')
      }
    }
    
    const user = await getCurrentUser(req)
    
    console.log('Auth me - User found:', user ? 'Yes' : 'No')
    if (user) {
      console.log('Auth me - User role:', user.role)
    }

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    return res.status(200).json(user)
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Error al verificar autenticación' })
  }
}

