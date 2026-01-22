import { generateQuotePDF } from '../../../lib/pdfGenerator'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      name, 
      email, 
      whatsapp, 
      cart, 
      notFoundProducts, 
      documentType,
      ruc,
      businessName,
      address
    } = req.body

    // Crear objeto quote temporal para el generador
    const tempQuote = {
      id: 'preview',
      quoteNumber: 0,
      name: name || 'Cliente',
      email: email || '',
      whatsapp: whatsapp || '',
      createdAt: new Date(),
      products: JSON.stringify({
        items: cart || [],
        notFoundProducts: notFoundProducts || [],
        documentType: documentType || 'boleta',
        fiscalData: documentType === 'factura' ? {
          ruc: ruc || '',
          businessName: businessName || '',
          address: address || ''
        } : null
      }),
      total: (cart || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0)
    }

    // Generar PDF usando el mismo generador del servidor
    const pdfBuffer = generateQuotePDF(tempQuote)

    // Configurar headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"')

    // Enviar el PDF
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error generating PDF preview:', error)
    return res.status(500).json({ error: 'Error al generar la previsualización del PDF' })
  }
}
