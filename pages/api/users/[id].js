import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PUT') {
    try {
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' })
      }

      if (user.role !== 'superadmin') {
        return res.status(403).json({ error: 'No tienes permisos' })
      }

      const { name, email, password, role, permissions } = req.body

      if (!name || !email) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' })
      }

      const updateData = {
        name,
        role: role || 'admin',
        permissions: permissions || '[]',
      }

      if (password) {
        updateData.password = await bcrypt.hash(password, 10)
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          createdAt: true,
        },
      })

      return res.status(200).json(updatedUser)
    } catch (error) {
      console.error('Error updating user:', error)
      return res.status(500).json({ error: 'Error al actualizar usuario' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' })
      }

      if (user.role !== 'superadmin') {
        return res.status(403).json({ error: 'No tienes permisos' })
      }

      // No permitir eliminar a uno mismo
      if (user.id === id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' })
      }

      await prisma.user.delete({
        where: { id },
      })

      return res.status(200).json({ message: 'Usuario eliminado' })
    } catch (error) {
      console.error('Error deleting user:', error)
      return res.status(500).json({ error: 'Error al eliminar usuario' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

