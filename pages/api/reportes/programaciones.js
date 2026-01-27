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
      const { email, sendDate, time, dateFrom, dateTo } = req.body

      if (!email || !sendDate || !time) {
        return res.status(400).json({ error: 'Email, fecha de envío y hora son requeridos' })
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email inválido' })
      }

      // Validar formato de hora (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(time)) {
        return res.status(400).json({ error: 'Formato de hora inválido. Debe ser HH:mm (ej: 18:00)' })
      }

      // Validar fecha de envío
      const sendDateObj = new Date(sendDate)
      if (isNaN(sendDateObj.getTime())) {
        return res.status(400).json({ error: 'Fecha de envío inválida' })
      }

      // Validar fechas del rango si están presentes
      let dateFromDate = null
      let dateToDate = null
      if (dateFrom) {
        dateFromDate = new Date(dateFrom)
        if (isNaN(dateFromDate.getTime())) {
          return res.status(400).json({ error: 'Fecha desde inválida' })
        }
      }
      if (dateTo) {
        dateToDate = new Date(dateTo)
        if (isNaN(dateToDate.getTime())) {
          return res.status(400).json({ error: 'Fecha hasta inválida' })
        }
      }
      if (dateFromDate && dateToDate && dateFromDate > dateToDate) {
        return res.status(400).json({ error: 'La fecha desde no puede ser mayor que la fecha hasta' })
      }

      // Usar 'daily' como scheduleType por defecto (para compatibilidad con el cron)
      const schedule = await prisma.reportSchedule.create({
        data: {
          email,
          scheduleType: 'daily', // Valor por defecto para compatibilidad
          time,
          dateFrom: dateFromDate,
          dateTo: dateToDate,
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
