import { prisma } from '../../../lib/prisma'
import { generateQuotesSummaryPDF } from '../../../lib/pdfGenerator'

// Este endpoint será llamado por un cron job (Vercel Cron o servicio externo)
export default async function handler(req, res) {
  // Verificar que sea una llamada autorizada desde Vercel Cron
  // Vercel Cron envía un header especial, pero también verificamos el secret por seguridad
  const authToken = req.headers['x-vercel-cron'] || req.headers['x-cron-secret'] || req.query.secret
  const expectedToken = process.env.CRON_SECRET

  // Si CRON_SECRET está configurado, verificar el token
  // Si no está configurado, solo permitir llamadas desde Vercel Cron (header x-vercel-cron)
  if (expectedToken) {
    if (authToken !== expectedToken && !req.headers['x-vercel-cron']) {
      return res.status(401).json({ error: 'No autorizado' })
    }
  } else if (!req.headers['x-vercel-cron']) {
    // Si no hay CRON_SECRET configurado, solo permitir llamadas desde Vercel Cron
    return res.status(401).json({ error: 'No autorizado. Solo Vercel Cron puede llamar este endpoint.' })
  }

  try {
    // Obtener todas las programaciones activas
    const activeSchedules = await prisma.reportSchedule.findMany({
      where: {
        isActive: true
      }
    })

    if (activeSchedules.length === 0) {
      return res.status(200).json({ message: 'No hay programaciones activas' })
    }

    const now = new Date()
    const currentHour = String(now.getHours()).padStart(2, '0')
    const currentMinute = String(now.getMinutes()).padStart(2, '0')
    const currentTime = `${currentHour}:${currentMinute}`

    const results = []

    for (const schedule of activeSchedules) {
      // Verificar si es la hora programada
      if (schedule.time !== currentTime) {
        continue
      }

      // Verificar si ya se envió hoy (para daily)
      if (schedule.scheduleType === 'daily' && schedule.lastSent) {
        const lastSentDate = new Date(schedule.lastSent)
        const today = new Date()
        if (
          lastSentDate.getDate() === today.getDate() &&
          lastSentDate.getMonth() === today.getMonth() &&
          lastSentDate.getFullYear() === today.getFullYear()
        ) {
          continue // Ya se envió hoy
        }
      }

      // Calcular rango de fechas según el tipo o usar fechas personalizadas
      let startDate = new Date()
      let endDate = new Date()
      endDate.setHours(23, 59, 59, 999)

      // Si hay fechas personalizadas, usarlas; si no, calcular según el tipo
      if (schedule.dateFrom && schedule.dateTo) {
        startDate = new Date(schedule.dateFrom)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(schedule.dateTo)
        endDate.setHours(23, 59, 59, 999)
      } else {
        // Lógica original basada en el tipo
        if (schedule.scheduleType === 'daily') {
          startDate.setHours(0, 0, 0, 0)
        } else if (schedule.scheduleType === 'weekly') {
          startDate.setDate(startDate.getDate() - 7)
          startDate.setHours(0, 0, 0, 0)
        } else if (schedule.scheduleType === 'monthly') {
          startDate.setMonth(startDate.getMonth() - 1)
          startDate.setHours(0, 0, 0, 0)
        }
      }

      // Obtener cotizaciones en el rango
      const quotes = await prisma.quote.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Generar PDF
      const pdfBuffer = generateQuotesSummaryPDF(quotes, schedule.scheduleType, startDate, endDate)

      // Enviar a N8N - Usar webhook específico para reportes programados
      const n8nWebhookUrl = process.env.N8N_REPORTES_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL
      if (n8nWebhookUrl) {
        try {
          // Calcular estadísticas del reporte
          const totalAmount = quotes.reduce((sum, q) => sum + (q.total || 0), 0)
          const approvedQuotes = quotes.filter(q => q.status === 'approved' || q.status === 'authorized' || q.status === 'completed').length
          const pendingQuotes = quotes.filter(q => q.status === 'pending' || q.status === 'sent').length
          
          // Formatear período
          const periodFrom = startDate.toLocaleDateString('es-PE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
          const periodTo = endDate.toLocaleDateString('es-PE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
          const period = `${periodFrom} - ${periodTo}`
          
          // Crear FormData
          const formData = new FormData()
          
          // Convertir Buffer a Blob para FormData (Node.js 18+ tiene Blob global)
          const pdfUint8Array = new Uint8Array(pdfBuffer)
          const pdfBlob = new Blob([pdfUint8Array], { type: 'application/pdf' })
          const fileName = `reporte-cotizaciones-${schedule.scheduleType}-${startDate.toISOString().split('T')[0]}.pdf`
          
          // Estructurar datos como objeto body (similar a cambio de precios)
          const bodyPayload = {
            event: 'scheduled_report',
            email: schedule.email,
            reportType: schedule.scheduleType,
            reportTypeLabel: schedule.scheduleType === 'daily' ? 'Diario' : schedule.scheduleType === 'weekly' ? 'Semanal' : 'Mensual',
            period: period,
            periodFrom: periodFrom,
            periodTo: periodTo,
            dateFrom: startDate.toISOString(),
            dateTo: endDate.toISOString(),
            totalQuotes: quotes.length,
            totalAmount: totalAmount.toFixed(2),
            approvedQuotes: approvedQuotes,
            pendingQuotes: pendingQuotes,
            sendDate: schedule.sendDate ? new Date(schedule.sendDate).toLocaleDateString('es-PE') : null,
            sendTime: schedule.time,
            scheduleId: schedule.id,
            createdAt: schedule.createdAt ? new Date(schedule.createdAt).toISOString() : null
          }
          
          // Agregar el body como JSON stringificado
          formData.append('body', JSON.stringify(bodyPayload))
          
          // También agregar campos individuales para compatibilidad
          formData.append('email', schedule.email)
          formData.append('reportType', schedule.scheduleType)
          formData.append('period', period)
          formData.append('totalQuotes', quotes.length.toString())
          formData.append('totalAmount', totalAmount.toFixed(2))
          
          // Agregar el PDF
          formData.append('pdf', pdfBlob, fileName)

          const webhookResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            body: formData
          })

          if (webhookResponse.ok) {
            // Actualizar lastSent
            await prisma.reportSchedule.update({
              where: { id: schedule.id },
              data: { lastSent: now }
            })

            results.push({
              scheduleId: schedule.id,
              email: schedule.email,
              status: 'success',
              quotesCount: quotes.length
            })
          } else {
            results.push({
              scheduleId: schedule.id,
              email: schedule.email,
              status: 'error',
              error: `N8N webhook responded with status ${webhookResponse.status}`
            })
          }
        } catch (webhookError) {
          console.error(`Error enviando reporte a ${schedule.email}:`, webhookError)
          results.push({
            scheduleId: schedule.id,
            email: schedule.email,
            status: 'error',
            error: webhookError.message
          })
        }
      } else {
        results.push({
          scheduleId: schedule.id,
          email: schedule.email,
          status: 'error',
          error: 'N8N_REPORTES_WEBHOOK_URL o N8N_WEBHOOK_URL no configurada'
        })
      }
    }

    return res.status(200).json({
      message: 'Proceso de reportes programados completado',
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('Error ejecutando reportes programados:', error)
    return res.status(500).json({ 
      error: 'Error al ejecutar reportes programados',
      message: error.message 
    })
  }
}
