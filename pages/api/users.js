import { prisma } from '../../lib/prisma'
import { getCurrentUser } from '../../lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' })
      }

      // Solo superadmin puede ver usuarios
      if (user.role !== 'superadmin') {
        return res.status(403).json({ error: 'No tienes permisos' })
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return res.status(200).json(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ error: 'Error al obtener usuarios' })
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' })
      }

      // Solo superadmin puede crear usuarios
      if (user.role !== 'superadmin') {
        return res.status(403).json({ error: 'No tienes permisos' })
      }

      const { name, email, password, role } = req.body

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' })
      }

      // Verificar si el email ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return res.status(400).json({ error: 'El email ya está registrado' })
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10)

      // Determinar permisos por defecto según el rol
      let defaultPermissions = []
      if (role === 'superadmin' || role === 'admin') {
        defaultPermissions = ['view', 'create', 'edit', 'delete']
      } else if (role === 'cotizador') {
        defaultPermissions = ['view', 'approve', 'reject']
      } else if (role === 'editor') {
        defaultPermissions = ['view', 'create', 'edit']
      } else if (role === 'viewer') {
        defaultPermissions = ['view']
      }

      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'admin',
          permissions: JSON.stringify(defaultPermissions),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          createdAt: true,
        },
      })

      return res.status(201).json(newUser)
    } catch (error) {
      console.error('Error creating user:', error)
      return res.status(500).json({ error: 'Error al crear usuario' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

