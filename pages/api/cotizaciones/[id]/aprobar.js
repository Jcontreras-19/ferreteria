import { prisma } from '../../../../lib/prisma'
import { getCurrentUser } from '../../../../lib/auth'
import { generateQuotePDF } from '../../../../lib/pdfGenerator'

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Verificar que el usuario sea cotizador, vendedor o admin
    const allowedRoles = ['admin', 'superadmin', 'cotizador', 'vendedor']
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'No tienes permiso para aprobar cotizaciones' })
    }

    const { id } = req.query
    const { estimatedDelivery, notes, clientEmail } = req.body

    // Validar que se proporcione el correo del cliente
    if (!clientEmail || !clientEmail.trim()) {
      return res.status(400).json({ error: 'El correo del cliente es requerido' })
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clientEmail.trim())) {
      return res.status(400).json({ error: 'El correo del cliente no es válido' })
    }

    // Obtener la cotización antes de actualizarla para tener todos los datos
    const quoteBeforeUpdate = await prisma.quote.findUnique({
      where: { id },
    })

    if (!quoteBeforeUpdate) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }

    // Actualizar la cotización
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: user.id,
        estimatedDelivery: estimatedDelivery ? parseInt(estimatedDelivery) : null,
        notes: notes || null,
        email: clientEmail.trim(), // Actualizar el correo con el del cliente
        updatedAt: new Date(),
      },
    })

    // Enviar a N8N webhook después de aprobar
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (n8nWebhookUrl) {
      try {
        console.log('📤 Enviando cotización aprobada a N8N webhook...')
        console.log(`   URL: ${n8nWebhookUrl}`)
        console.log(`   Cliente: ${updatedQuote.name} (${clientEmail.trim()})`)
        console.log(`   Cotización #${updatedQuote.quoteNumber}`)

        // Parsear productos
        let products = []
        let notFoundProducts = []
        try {
          const productsData = typeof updatedQuote.products === 'string'
            ? JSON.parse(updatedQuote.products)
            : updatedQuote.products
          products = productsData.items || productsData
          notFoundProducts = productsData.notFoundProducts || []
          if (!Array.isArray(notFoundProducts)) {
            notFoundProducts = []
          }
        } catch (e) {
          products = []
          notFoundProducts = []
        }

        // Formatear productos para el carrito
        const carritoFormato = products.map(product => ({
          nombre: product.name || product.nombre || '',
          cantidad: product.quantity || product.cantidad || 1,
          precio: product.price || product.precio || 0
        }))

        // Generar PDF de la cotización
        console.log('   Generando PDF de la cotización...')
        const pdfBuffer = generateQuotePDF(updatedQuote)
        console.log('   ✅ PDF generado exitosamente')

        // Crear FormData para enviar datos JSON y PDF como archivo adjunto
        const formData = new FormData()
        
        // Agregar datos del cliente (usar el correo proporcionado)
        formData.append('name', updatedQuote.name)
        formData.append('email', clientEmail.trim())
        formData.append('phone', updatedQuote.whatsapp)
        
        // Agregar campos adicionales para el email de N8N (acceso directo sin parsear JSON)
        formData.append('clientNombre', updatedQuote.name || '')
        formData.append('numeroCotizacion', `#${updatedQuote.quoteNumber || ''}`)
        formData.append('quoteNumber', (updatedQuote.quoteNumber || 0).toString())
        formData.append('total', (updatedQuote.total || 0).toString())
        
        // Crear payload con estructura que N8N espera
        const bodyPayload = {
          cliente: {
            nombre: updatedQuote.name,
            email: clientEmail.trim(), // Usar el correo del cliente proporcionado
            whatsapp: updatedQuote.whatsapp,
          },
          carrito: carritoFormato,
          productosNoEncontrados: notFoundProducts,
          quoteId: updatedQuote.id,
          quoteNumber: updatedQuote.quoteNumber,
          numeroCotizacion: `#${updatedQuote.quoteNumber}`,
          total: updatedQuote.total,
          documentType: updatedQuote.documentType || 'boleta',
          documentNumber: updatedQuote.documentNumber || null,
          ruc: null,
          businessName: null,
          address: null,
          createdAt: updatedQuote.createdAt.toISOString(),
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
        const pdfFileName = `cotizacion - ${updatedQuote.quoteNumber}.pdf`
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
            // No fallar la aprobación si el webhook falla
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
          // No fallar la aprobación si el webhook falla
        }
      } catch (webhookError) {
        console.error('❌ Error sending to N8N webhook:', webhookError)
        console.error('   Error details:', {
          message: webhookError.message,
          stack: webhookError.stack,
        })
        // No fallar la aprobación si el webhook falla
      }
    } else {
      console.warn('⚠️ N8N_WEBHOOK_URL no está configurada. El webhook no se enviará.')
    }

    return res.status(200).json(updatedQuote)
  } catch (error) {
    console.error('Error approving quote:', error)
    return res.status(500).json({ error: 'Error al aprobar cotización' })
  }
}
