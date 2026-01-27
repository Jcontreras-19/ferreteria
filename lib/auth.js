import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export async function getCurrentUser(req) {
  // En Next.js, las cookies se leen de req.cookies automáticamente
  // También intentar leer del header Cookie por si acaso
  let token = req.cookies?.token
  
  // Si no está en req.cookies, intentar parsear del header Cookie
  if (!token && req.headers?.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {})
    token = cookies.token
  }
  
  if (!token) {
    console.log('getCurrentUser: No token found. Cookies:', req.cookies)
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    console.log('getCurrentUser: Token invalid or expired')
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, phone: true, role: true },
    })

    if (!user) {
      console.log('getCurrentUser: User not found in database for id:', decoded.id)
      return null
    }

    return user
  } catch (error) {
    console.error('getCurrentUser: Database error:', error)
    return null
  }
}

