import { prisma } from '../../../lib/prisma'
import { generateToken } from '../../../lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, phone, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' })
  }

  if (!phone) {
    return res.status(400).json({ error: 'El teléfono es requerido' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' })
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario con rol "customer" (o "user" si prefieres)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: 'customer', // Rol para clientes normales
        permissions: JSON.stringify(['view']), // Solo pueden ver
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    })

    // Generar token y establecer cookie
    const token = generateToken(newUser)

    res.setHeader(
      'Set-Cookie',
      `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
    )

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Error al crear la cuenta' })
  }
}

