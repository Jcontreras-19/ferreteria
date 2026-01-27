import { prisma } from '../../../../lib/prisma'
import { generateQuotePDF, generateDocumentPDF } from '../../../../lib/pdfGenerator'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const { download } = req.query

  try {
    // Buscar la cotización
    const quote = await prisma.quote.findUnique({
      where: { id },
    })

    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }

    // Si está autorizada y tiene documento, generar boleta/factura
    // Si no, generar cotización normal
    let pdfBuffer
    let filename
    
    if (quote.status === 'authorized' && quote.documentType && quote.documentNumber) {
      // Generar boleta/factura con diseño mejorado
      pdfBuffer = generateDocumentPDF(quote)
      const docType = quote.documentType === 'factura' ? 'Factura' : 'Boleta'
      filename = `${docType}-${quote.documentNumber}.pdf`
    } else {
      // Generar cotización normal
      pdfBuffer = generateQuotePDF(quote)
      filename = `cotizacion-${quote.quoteNumber || quote.id.slice(0, 8)}.pdf`
    }

    // Configurar headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      download === '1'
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`
    )

    // Enviar el PDF
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error generating PDF:', error)
    return res.status(500).json({ error: 'Error al generar el PDF' })
  }
}
