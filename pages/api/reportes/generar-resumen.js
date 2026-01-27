import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'
import { generateQuotesSummaryPDF } from '../../../lib/pdfGenerator'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Solo admin y superadmin pueden generar reportes
    const adminRoles = ['admin', 'superadmin']
    if (!adminRoles.includes(user.role?.toLowerCase())) {
      return res.status(403).json({ error: 'Solo administradores pueden generar reportes' })
    }

    const { periodType, startDate, endDate } = req.body

    if (!periodType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Tipo de período, fecha inicio y fecha fin son requeridos' })
    }

    // Calcular rango de fechas
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999) // Incluir todo el día final

    // Obtener cotizaciones en el rango
    const quotes = await prisma.quote.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Generar PDF
    const pdfBuffer = generateQuotesSummaryPDF(quotes, periodType, start, end)

    // Retornar PDF como base64 o buffer
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="reporte-cotizaciones-${periodType}-${startDate}.pdf"`)
    return res.send(pdfBuffer)
  } catch (error) {
    console.error('Error generando resumen:', error)
    return res.status(500).json({ 
      error: 'Error al generar el reporte',
      message: error.message 
    })
  }
}
