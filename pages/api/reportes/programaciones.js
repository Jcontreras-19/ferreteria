import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'

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

    // GET: Obtener todas las programaciones
    if (req.method === 'GET') {
      const schedules = await prisma.reportSchedule.findMany({
        orderBy: { createdAt: 'desc' }
      })
      return res.status(200).json(schedules)
    }

    // POST: Crear nueva programación
    if (req.method === 'POST') {
      const { email, scheduleType, time } = req.body

      if (!email || !scheduleType || !time) {
        return res.status(400).json({ error: 'Email, tipo de programación y hora son requeridos' })
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email inválido' })
      }

      // Validar tipo de programación
      const validTypes = ['daily', 'weekly', 'monthly']
      if (!validTypes.includes(scheduleType)) {
        return res.status(400).json({ error: 'Tipo de programación inválido. Debe ser: daily, weekly o monthly' })
      }

      // Validar formato de hora (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(time)) {
        return res.status(400).json({ error: 'Formato de hora inválido. Debe ser HH:mm (ej: 18:00)' })
      }

      const schedule = await prisma.reportSchedule.create({
        data: {
          email,
          scheduleType,
          time,
          isActive: true,
          createdBy: user.id
        }
      })

      return res.status(201).json(schedule)
    }

    return res.status(405).json({ error: 'Método no permitido' })
  } catch (error) {
    console.error('Error en programaciones:', error)
    return res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      message: error.message 
    })
  }
}
