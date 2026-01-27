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
      const { email, scheduleType, sendDate, time, isActive, dateFrom, dateTo } = req.body

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

      if (sendDate !== undefined) {
        if (sendDate === null || sendDate === '') {
          updateData.sendDate = null
        } else {
          // Crear fecha en zona horaria local para evitar problemas de UTC
          const sendDateObj = new Date(sendDate + 'T12:00:00') // Agregar hora del mediodía para evitar problemas de zona horaria
          if (isNaN(sendDateObj.getTime())) {
            return res.status(400).json({ error: 'Fecha de envío inválida' })
          }
          // Ajustar a UTC medianoche para guardar correctamente
          sendDateObj.setUTCHours(0, 0, 0, 0)
          updateData.sendDate = sendDateObj
        }
      }

      if (time !== undefined) {
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(time)) {
          return res.status(400).json({ error: 'Formato de hora inválido. Debe ser HH:mm' })
        }
        updateData.time = time
      }

      if (dateFrom !== undefined) {
        if (dateFrom === null || dateFrom === '') {
          updateData.dateFrom = null
        } else {
          const dateFromDate = new Date(dateFrom)
          if (isNaN(dateFromDate.getTime())) {
            return res.status(400).json({ error: 'Fecha desde inválida' })
          }
          updateData.dateFrom = dateFromDate
        }
      }

      if (dateTo !== undefined) {
        if (dateTo === null || dateTo === '') {
          updateData.dateTo = null
        } else {
          const dateToDate = new Date(dateTo)
          if (isNaN(dateToDate.getTime())) {
            return res.status(400).json({ error: 'Fecha hasta inválida' })
          }
          updateData.dateTo = dateToDate
        }
      }

      // Validar que dateFrom no sea mayor que dateTo si ambos están presentes
      if (updateData.dateFrom && updateData.dateTo && updateData.dateFrom > updateData.dateTo) {
        return res.status(400).json({ error: 'La fecha desde no puede ser mayor que la fecha hasta' })
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
