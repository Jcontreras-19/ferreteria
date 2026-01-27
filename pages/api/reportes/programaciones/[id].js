import { prisma } from '../../../../lib/prisma'
import { getCurrentUser } from '../../../../lib/auth'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Solo admin y superadmin pueden gestionar programaciones
    const adminRoles = ['admin', 'superadmin']
    if (!adminRoles.includes(user.role?.toLowerCase())) {
      return res.status(403).json({ error: 'Solo administradores pueden gestionar programaciones' })
    }

    const { id } = req.query

    // PUT: Actualizar programación
    if (req.method === 'PUT') {
      const { email, scheduleType, time, isActive } = req.body

      const updateData = {}
      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Email inválido' })
        }
        updateData.email = email
      }

      if (scheduleType !== undefined) {
        const validTypes = ['daily', 'weekly', 'monthly']
        if (!validTypes.includes(scheduleType)) {
          return res.status(400).json({ error: 'Tipo de programación inválido' })
        }
        updateData.scheduleType = scheduleType
      }

      if (time !== undefined) {
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(time)) {
          return res.status(400).json({ error: 'Formato de hora inválido. Debe ser HH:mm' })
        }
        updateData.time = time
      }

      if (isActive !== undefined) {
        updateData.isActive = isActive
      }

      const schedule = await prisma.reportSchedule.update({
        where: { id },
        data: updateData
      })

      return res.status(200).json(schedule)
    }

    // DELETE: Eliminar programación
    if (req.method === 'DELETE') {
      await prisma.reportSchedule.delete({
        where: { id }
      })
      return res.status(200).json({ message: 'Programación eliminada exitosamente' })
    }

    return res.status(405).json({ error: 'Método no permitido' })
  } catch (error) {
    console.error('Error en programación:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Programación no encontrada' })
    }
    return res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      message: error.message 
    })
  }
}
