import { prisma } from '../../../../lib/prisma'
import { getCurrentUser } from '../../../../lib/auth'
import { generateQuotePDF } from '../../../../lib/pdfGenerator'

// Generar número de documento secuencial
async function generateDocumentNumber(documentType) {
  const prefix = documentType === 'factura' ? 'F' : 'B'
  const year = new Date().getFullYear()
  
  // Buscar el último número de documento del año
  const lastQuote = await prisma.quote.findFirst({
    where: {
      documentType: documentType,
      documentNumber: {
        startsWith: `${prefix}-${year}-`
      }
    },
    orderBy: {
      documentNumber: 'desc'
    }
  })

  let nextNumber = 1
  if (lastQuote?.documentNumber) {
    const lastNumber = parseInt(lastQuote.documentNumber.split('-')[2])
    nextNumber = lastNumber + 1
  }

  return `${prefix}-${year}-${String(nextNumber).padStart(6, '0')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Solo admin y superadmin pueden autorizar despachos
    const allowedRoles = ['admin', 'superadmin']
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Solo administradores pueden autorizar despachos' })
    }

    const { id } = req.query
    const { documentType } = req.body

    if (!documentType || !['boleta', 'factura'].includes(documentType)) {
      return res.status(400).json({ error: 'Tipo de documento inválido. Debe ser "boleta" o "factura"' })
    }

    // Obtener la cotización
    const quote = await prisma.quote.findUnique({
      where: { id },
    })

    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }

    if (quote.status !== 'approved') {
      return res.status(400).json({ error: 'Solo se pueden autorizar cotizaciones aprobadas' })
    }

    // Parsear productos
    let products
    try {
      const productsData = typeof quote.products === 'string' 
        ? JSON.parse(quote.products) 
        : quote.products
      products = productsData.items || productsData
    } catch (e) {
      return res.status(400).json({ error: 'Error al parsear productos de la cotización' })
    }

    // Verificar stock y descontar
    const stockUpdates = []
    for (const product of products) {
      const productId = product.id
      const quantity = product.quantity || 1

      const dbProduct = await prisma.product.findUnique({
        where: { id: productId },
      })

      if (!dbProduct) {
        return res.status(400).json({ 
          error: `Producto ${product.name || productId} no encontrado` 
        })
      }

      if (dbProduct.stock < quantity) {
        return res.status(400).json({ 
          error: `Stock insuficiente para ${product.name || dbProduct.name}. Disponible: ${dbProduct.stock}, Solicitado: ${quantity}` 
        })
      }

      stockUpdates.push({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      })
    }

    // Generar número de documento
    const documentNumber = await generateDocumentNumber(documentType)

    // Actualizar cotización y descontar stock en una transacción
    const [updatedQuote] = await prisma.$transaction([
      // Actualizar cotización
      prisma.quote.update({
        where: { id },
        data: {
          status: 'authorized',
          authorizedBy: user.id,
          authorizedAt: new Date(),
          documentType: documentType,
          documentNumber: documentNumber,
          updatedAt: new Date(),
        },
      }),
      // Descontar stock de todos los productos
      ...stockUpdates.map(update => 
        prisma.product.update(update)
      ),
    ])

    // Enviar a N8N webhook después de autorizar
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (n8nWebhookUrl) {
      try {
        console.log('📤 Enviando cotización autorizada a N8N webhook...')
        console.log(`   URL: ${n8nWebhookUrl}`)
        console.log(`   Cliente: ${updatedQuote.name} (${updatedQuote.email})`)
        console.log(`   Cotización #${updatedQuote.quoteNumber}`)
        console.log(`   Documento: ${documentType} ${documentNumber}`)

        // Formatear productos para el carrito
        const carritoFormato = products.map(product => ({
          nombre: product.name || product.nombre || '',
          cantidad: product.quantity || product.cantidad || 1,
          precio: product.price || product.precio || 0
        }))

        // Obtener productos no encontrados si existen
        const productsData = typeof updatedQuote.products === 'string' 
          ? JSON.parse(updatedQuote.products) 
          : updatedQuote.products
        const productosNoEncontradosFormato = productsData.notFoundProducts || []

        // Generar PDF de la cotización
        console.log('   Generando PDF de la cotización...')
        const pdfBuffer = generateQuotePDF({
          ...updatedQuote,
          products: products,
        })
        console.log('   ✅ PDF generado exitosamente')

        // Crear FormData para enviar datos JSON y PDF como archivo adjunto
        const formData = new FormData()
        
        // Agregar datos del cliente
        formData.append('name', updatedQuote.name)
        formData.append('email', updatedQuote.email)
        formData.append('phone', updatedQuote.whatsapp)
        
        // Crear payload con estructura que N8N espera
        // IMPORTANTE: Para que N8N pueda acceder a $json.body.cliente.email,
        // el body debe tener la estructura correcta
        const bodyPayload = {
          cliente: {
            nombre: updatedQuote.name,
            email: updatedQuote.email,
            whatsapp: updatedQuote.whatsapp,
          },
          carrito: carritoFormato,
          productosNoEncontrados: productosNoEncontradosFormato,
          quoteId: updatedQuote.id,
          quoteNumber: updatedQuote.quoteNumber,
          numeroCotizacion: `#${updatedQuote.quoteNumber}`,
          total: updatedQuote.total,
          documentType: documentType,
          documentNumber: documentNumber,
          ruc: productsData.fiscalData?.ruc || null,
          businessName: productsData.fiscalData?.businessName || null,
          address: productsData.fiscalData?.address || null,
          createdAt: updatedQuote.createdAt.toISOString(),
          authorizedAt: updatedQuote.authorizedAt?.toISOString() || new Date().toISOString(),
          estimatedDelivery: updatedQuote.estimatedDelivery || null,
          notes: updatedQuote.notes || null,
        }
        
        // Enviar el body como JSON string - N8N lo parseará automáticamente
        formData.append('body', JSON.stringify(bodyPayload))
        
        // También enviamos el payload completo con estructura params/query/body para compatibilidad
        const webhookPayload = {
          params: {},
          query: {},
          body: bodyPayload,
        }
        formData.append('data', JSON.stringify(webhookPayload))
        
        // Agregar el PDF como archivo adjunto
        const pdfUint8Array = new Uint8Array(pdfBuffer)
        const pdfBlob = new Blob([pdfUint8Array], { type: 'application/pdf' })
        const pdfFileName = `cotizacion-${updatedQuote.quoteNumber || updatedQuote.id.slice(0, 8)}-${documentNumber}.pdf`
        formData.append('pdf', pdfBlob, pdfFileName)
        
        console.log('   Payload preparado con PDF adjunto')
        console.log('   Nombre del archivo PDF:', pdfFileName)

        // Crear un AbortController para timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout

        try {
          // Enviar FormData con PDF adjunto (multipart/form-data)
          const webhookResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            body: formData, // FormData establece automáticamente Content-Type: multipart/form-data
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          console.log(`   Response Status: ${webhookResponse.status} ${webhookResponse.statusText}`)

          if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text()
            console.error(`❌ Error en webhook N8N: Status ${webhookResponse.status}`)
            console.error(`   Response: ${errorText}`)
            console.error(`   URL del webhook: ${n8nWebhookUrl}`)
            // No fallar la autorización si el webhook falla
          } else {
            const webhookData = await webhookResponse.json().catch(() => null)
            console.log('✅ Webhook N8N respondió exitosamente')
            if (webhookData) {
              console.log('   Response data:', JSON.stringify(webhookData, null, 2))
            }
          }
        } catch (fetchError) {
          clearTimeout(timeoutId)
          
          if (fetchError.name === 'AbortError') {
            console.error('❌ Timeout al enviar webhook a N8N (30 segundos)')
            console.error(`   URL: ${n8nWebhookUrl}`)
          } else if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
            console.error('❌ Error de conexión con N8N webhook')
            console.error(`   URL: ${n8nWebhookUrl}`)
            console.error(`   Error: ${fetchError.message}`)
          } else {
            console.error('❌ Error sending to N8N webhook:', fetchError)
          }
          // No fallar la autorización si el webhook falla
        }
      } catch (webhookError) {
        console.error('❌ Error sending to N8N webhook:', webhookError)
        console.error('   Error details:', {
          message: webhookError.message,
          stack: webhookError.stack,
        })
        // No fallar la autorización si el webhook falla
      }
    } else {
      console.warn('⚠️ N8N_WEBHOOK_URL no está configurada. El webhook no se enviará.')
    }

    return res.status(200).json({
      ...updatedQuote,
      message: `Despacho autorizado. ${documentType === 'factura' ? 'Factura' : 'Boleta'} generada: ${documentNumber}`,
    })
  } catch (error) {
    console.error('Error authorizing dispatch:', error)
    return res.status(500).json({ error: 'Error al autorizar despacho' })
  }
}
