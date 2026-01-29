import { prisma } from '../../../lib/prisma'
import { generateToken } from '../../../lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  console.log('Login attempt:', { email, hasPassword: !!password })

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    console.log('User found:', user ? 'Yes' : 'No')

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('Password valid:', isValidPassword)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const token = generateToken(user)

    // Configurar cookie de sesión (se elimina al cerrar el navegador)
    const cookieOptions = [
      `token=${token}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      process.env.NODE_ENV === 'production' ? 'Secure' : ''
    ].filter(Boolean).join('; ')

    res.setHeader('Set-Cookie', cookieOptions)

    console.log('Login successful for:', email)

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: `Error al iniciar sesión: ${error.message}` })
  }
}

