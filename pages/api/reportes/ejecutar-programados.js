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
      console.log('[Reportes Programados] No hay programaciones activas')
      return res.status(200).json({ message: 'No hay programaciones activas' })
    }

    console.log(`[Reportes Programados] Procesando ${activeSchedules.length} programación(es) activa(s)`)

    // Obtener hora actual en zona horaria de Perú (America/Lima, UTC-5)
    const now = new Date()
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }))
    const currentHour = String(peruTime.getHours()).padStart(2, '0')
    const currentMinute = String(peruTime.getMinutes()).padStart(2, '0')
    const currentTime = `${currentHour}:${currentMinute}`

    console.log(`[Reportes Programados] Hora actual (UTC): ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}, Hora actual (Perú): ${currentTime}`)

    const results = []
    const skippedSchedules = [] // Para trackear programaciones saltadas

    for (const schedule of activeSchedules) {
      // Verificar si es la hora programada (con tolerancia de 5 minutos)
      // Como el cron se ejecuta cada 5 minutos, verificamos si la hora programada
      // está dentro del rango de los últimos 5 minutos (incluyendo el minuto exacto)
      const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number)
      const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute
      const currentTimeInMinutes = peruTime.getHours() * 60 + peruTime.getMinutes()
      
      // Verificar si la hora programada está dentro del rango de los últimos 5 minutos
      // Esto permite que funcione aunque el cron no se ejecute exactamente a esa hora
      const timeDifference = currentTimeInMinutes - scheduleTimeInMinutes
      console.log(`[Schedule ${schedule.id}] Hora programada: ${schedule.time}, Hora actual: ${currentTime}, Diferencia: ${timeDifference} minutos`)
      
      // Permitir ejecución si:
      // 1. La hora programada ya pasó (timeDifference >= 0)
      // 2. No ha pasado más de 5 minutos (timeDifference <= 5) - INCLUSIVE para permitir hasta 5 minutos
      // 3. O si es exactamente la hora programada
      if (timeDifference < 0) {
        const skipReason = `Hora programada aún no ha llegado (diferencia: ${timeDifference} minutos)`
        console.log(`[Schedule ${schedule.id}] ⏭️ Saltando: ${skipReason}`)
        skippedSchedules.push({
          id: schedule.id,
          email: schedule.email,
          time: schedule.time,
          reason: skipReason,
          timeDifference
        })
        continue // La hora programada aún no ha llegado
      }
      
      if (timeDifference > 5) {
        const skipReason = `Hora programada ya pasó hace más de 5 minutos (diferencia: ${timeDifference} minutos)`
        console.log(`[Schedule ${schedule.id}] ⏭️ Saltando: ${skipReason}`)
        skippedSchedules.push({
          id: schedule.id,
          email: schedule.email,
          time: schedule.time,
          reason: skipReason,
          timeDifference
        })
        continue // Ya pasó más de 5 minutos, no ejecutar
      }

      // Verificar si la fecha de envío es hoy o ayer (si está configurada)
      // Permitir hasta 24 horas de retraso para ejecuciones que fallaron el día anterior
      // Usar zona horaria de Perú para comparar fechas
      if (schedule.sendDate) {
        const sendDate = new Date(schedule.sendDate)
        
        // Obtener componentes de fecha en zona horaria de Perú usando Intl.DateTimeFormat
        const peruFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Lima',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        })
        
        // Obtener fecha actual en Perú
        const todayParts = peruFormatter.formatToParts(now)
        const todayPeru = {
          year: parseInt(todayParts.find(p => p.type === 'year').value),
          month: parseInt(todayParts.find(p => p.type === 'month').value) - 1, // Mes es 0-indexed
          day: parseInt(todayParts.find(p => p.type === 'day').value)
        }
        
        // Obtener fecha de ayer en Perú
        const yesterdayDate = new Date(now)
        yesterdayDate.setDate(yesterdayDate.getDate() - 1)
        const yesterdayParts = peruFormatter.formatToParts(yesterdayDate)
        const yesterdayPeru = {
          year: parseInt(yesterdayParts.find(p => p.type === 'year').value),
          month: parseInt(yesterdayParts.find(p => p.type === 'month').value) - 1,
          day: parseInt(yesterdayParts.find(p => p.type === 'day').value)
        }
        
        // Obtener fecha programada en Perú
        const sendDateParts = peruFormatter.formatToParts(sendDate)
        const sendDateLocal = {
          year: parseInt(sendDateParts.find(p => p.type === 'year').value),
          month: parseInt(sendDateParts.find(p => p.type === 'month').value) - 1,
          day: parseInt(sendDateParts.find(p => p.type === 'day').value)
        }
        
        const todayLocal = todayPeru
        const yesterdayLocal = yesterdayPeru
        
        console.log(`[Schedule ${schedule.id}] Fecha de envío: ${sendDateLocal.year}-${String(sendDateLocal.month + 1).padStart(2, '0')}-${String(sendDateLocal.day).padStart(2, '0')}, Hoy: ${todayLocal.year}-${String(todayLocal.month + 1).padStart(2, '0')}-${String(todayLocal.day).padStart(2, '0')}, Ayer: ${yesterdayLocal.year}-${String(yesterdayLocal.month + 1).padStart(2, '0')}-${String(yesterdayLocal.day).padStart(2, '0')}`)
        
        // Permitir ejecutar si la fecha programada es hoy o ayer (para permitir ejecuciones retrasadas)
        const isToday = (
          sendDateLocal.year === todayLocal.year &&
          sendDateLocal.month === todayLocal.month &&
          sendDateLocal.day === todayLocal.day
        )
        const isYesterday = (
          sendDateLocal.year === yesterdayLocal.year &&
          sendDateLocal.month === yesterdayLocal.month &&
          sendDateLocal.day === yesterdayLocal.day
        )
        
        if (!isToday && !isYesterday) {
          const skipReason = `Fecha de envío no es hoy ni ayer (programada: ${sendDateLocal.year}-${String(sendDateLocal.month + 1).padStart(2, '0')}-${String(sendDateLocal.day).padStart(2, '0')}, hoy: ${todayLocal.year}-${String(todayLocal.month + 1).padStart(2, '0')}-${String(todayLocal.day).padStart(2, '0')})`
          console.log(`[Schedule ${schedule.id}] ⏭️ Saltando: ${skipReason}`)
          skippedSchedules.push({
            id: schedule.id,
            email: schedule.email,
            time: schedule.time,
            sendDate: schedule.sendDate,
            reason: skipReason
          })
          continue // No es la fecha programada ni ayer
        }
      }
      
      console.log(`[Schedule ${schedule.id}] ✅ Hora y fecha coinciden, procesando...`)

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
      
      console.log(`  📊 Cotizaciones encontradas en el rango: ${quotes.length}`)
      console.log(`  📅 Rango de fechas: ${startDate.toISOString()} - ${endDate.toISOString()}`)

      // Generar PDF (incluso si no hay cotizaciones, el PDF mostrará estadísticas en 0)
      console.log(`  📄 Generando PDF...`)
      let pdfBuffer
      try {
        pdfBuffer = generateQuotesSummaryPDF(quotes, schedule.scheduleType, startDate, endDate)
      } catch (pdfError) {
        console.error(`  ❌ Error generando PDF para schedule ${schedule.id}:`, pdfError)
        results.push({
          scheduleId: schedule.id,
          email: schedule.email,
          status: 'error',
          error: `Error generando PDF: ${pdfError.message}`
        })
        continue
      }
      
      // Verificar que el PDF se generó correctamente
      if (!pdfBuffer || pdfBuffer.length === 0) {
        console.error(`  ❌ Error: PDF generado está vacío para schedule ${schedule.id}`)
        results.push({
          scheduleId: schedule.id,
          email: schedule.email,
          status: 'error',
          error: 'PDF generado está vacío'
        })
        continue
      }
      
      console.log(`  ✅ PDF generado exitosamente: ${pdfBuffer.length} bytes`)
      
      // Verificar que el PDF tiene un tamaño razonable (mínimo 2KB para un PDF válido con contenido)
      if (pdfBuffer.length < 2048) {
        console.warn(`  ⚠️ Advertencia: PDF muy pequeño (${pdfBuffer.length} bytes), podría estar corrupto o incompleto`)
        // No detenemos el proceso, pero registramos la advertencia
      }

      // Enviar a N8N - Usar webhook específico para reportes programados
      const n8nWebhookUrl = process.env.N8N_REPORTES_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL
      
      console.log(`[Reporte Programado] Procesando schedule ${schedule.id}:`)
      console.log(`  - Email: ${schedule.email}`)
      console.log(`  - Hora programada: ${schedule.time}`)
      console.log(`  - Hora actual: ${currentTime}`)
      console.log(`  - Cotizaciones encontradas: ${quotes.length}`)
      console.log(`  - N8N Webhook URL configurada: ${n8nWebhookUrl ? 'Sí' : 'No'}`)
      
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
          
          // Crear FormData (igual que en cotización normal que funciona)
          const formData = new FormData()
          
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
          
          // Agregar el body como JSON stringificado (PRIMERO, igual que en cotización normal)
          formData.append('body', JSON.stringify(bodyPayload))
          
          // También agregar campos individuales para compatibilidad (IMPORTANTE: estos deben estar al nivel raíz del JSON)
          formData.append('email', schedule.email)
          formData.append('reportType', schedule.scheduleType)
          formData.append('reportTypeLabel', bodyPayload.reportTypeLabel)
          formData.append('period', period)
          formData.append('totalQuotes', quotes.length.toString())
          formData.append('totalAmount', totalAmount.toFixed(2))
          formData.append('approvedQuotes', approvedQuotes.toString())
          formData.append('pendingQuotes', pendingQuotes.toString())
          
          // Preparar el PDF para enviar como binary (AL FINAL, igual que en cotización normal)
          const fileName = `reporte-cotizaciones-${schedule.scheduleType}-${startDate.toISOString().split('T')[0]}.pdf`
          
          console.log(`  📎 Archivo PDF: ${fileName}, Tamaño Buffer: ${pdfBuffer.length} bytes`)
          
          // Verificar que el Buffer tiene contenido
          if (pdfBuffer.length === 0 || pdfBuffer.length < 100) {
            console.error(`  ❌ Error: Buffer PDF está vacío o muy pequeño (${pdfBuffer.length} bytes)`)
            results.push({
              scheduleId: schedule.id,
              email: schedule.email,
              status: 'error',
              error: `PDF corrupto o vacío (${pdfBuffer.length} bytes)`
            })
            continue
          }
          
          // Convertir Buffer a Blob para FormData (igual que en cotización normal que funciona)
          const pdfUint8Array = new Uint8Array(pdfBuffer)
          const pdfBlob = new Blob([pdfUint8Array], { type: 'application/pdf' })
          
          console.log(`  📎 Blob creado: ${pdfBlob.size} bytes (debería ser igual a ${pdfBuffer.length})`)
          
          // Verificar que el Blob tiene el mismo tamaño que el Buffer
          if (pdfBlob.size !== pdfBuffer.length) {
            console.warn(`  ⚠️ Advertencia: Tamaño del Blob (${pdfBlob.size}) no coincide con el Buffer (${pdfBuffer.length})`)
          }
          
          // Agregar el PDF como archivo adjunto (AL FINAL, igual que en cotización normal)
          formData.append('pdf', pdfBlob, fileName)
          
          // También enviar el PDF como base64 como respaldo (por si N8N no recibe el binary correctamente)
          const pdfBase64 = pdfBuffer.toString('base64')
          formData.append('pdfBase64', pdfBase64)
          formData.append('pdfFileName', fileName)
          
          console.log(`  ✅ PDF agregado al FormData: ${fileName} (${pdfBlob.size} bytes, tipo: application/pdf)`)
          console.log(`  ✅ PDF también enviado como base64: ${pdfBase64.length} caracteres`)

          console.log(`  📤 Enviando a N8N webhook: ${n8nWebhookUrl}`)
          console.log(`  📊 Datos: ${quotes.length} cotizaciones, Total: S/. ${totalAmount.toFixed(2)}`)
          console.log(`  📧 Email a enviar: ${schedule.email}`)
          console.log(`  📋 Body payload (string): ${JSON.stringify(bodyPayload)}`)
          console.log(`  ✅ Email agregado directamente al FormData: ${schedule.email}`)
          
          const webhookResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            body: formData
          })
          
          console.log(`  📥 Respuesta de N8N: Status ${webhookResponse.status} ${webhookResponse.statusText}`)

          if (webhookResponse.ok) {
            console.log(`  ✅ Reporte enviado exitosamente a N8N para ${schedule.email}`)
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
            const errorText = await webhookResponse.text().catch(() => 'No se pudo leer el error')
            console.error(`  ❌ Error en N8N webhook: Status ${webhookResponse.status}`, errorText)
            results.push({
              scheduleId: schedule.id,
              email: schedule.email,
              status: 'error',
              error: `N8N webhook responded with status ${webhookResponse.status}: ${errorText}`
            })
          }
        } catch (webhookError) {
          console.error(`  ❌ Error enviando reporte a ${schedule.email}:`, webhookError)
          results.push({
            scheduleId: schedule.id,
            email: schedule.email,
            status: 'error',
            error: webhookError.message
          })
        }
      } else {
        console.error(`  ❌ N8N_REPORTES_WEBHOOK_URL o N8N_WEBHOOK_URL no configurada`)
        results.push({
          scheduleId: schedule.id,
          email: schedule.email,
          status: 'error',
          error: 'N8N_REPORTES_WEBHOOK_URL o N8N_WEBHOOK_URL no configurada'
        })
      }
    }

    console.log(`[Reportes Programados] Proceso completado. Resultados: ${results.length}`)
    results.forEach((result, index) => {
      console.log(`  Resultado ${index + 1}: ${result.email} - ${result.status}${result.error ? ` - Error: ${result.error}` : ''}`)
    })

    // Retornar información detallada para debugging
    return res.status(200).json({
      message: 'Proceso de reportes programados completado',
      processed: results.length,
      skipped: skippedSchedules.length,
      activeSchedules: activeSchedules.length,
      currentTime: currentTime,
      results: results,
      skippedSchedules: skippedSchedules,
      debug: {
        totalSchedules: activeSchedules.length,
        schedulesChecked: activeSchedules.map(s => ({
          id: s.id,
          email: s.email,
          time: s.time,
          sendDate: s.sendDate,
          dateFrom: s.dateFrom,
          dateTo: s.dateTo
        }))
      }
    })
  } catch (error) {
    console.error('Error ejecutando reportes programados:', error)
    return res.status(500).json({ 
      error: 'Error al ejecutar reportes programados',
      message: error.message 
    })
  }
}
