import { prisma } from '../../lib/prisma'
import { generateQuotePDF } from '../../lib/pdfGenerator'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, whatsapp, products, total, documentType, ruc, businessName, address, notFoundProducts, skipWebhook } = req.body

  if (!name || !email || !whatsapp || !products || products.length === 0) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' })
  }

  // Validación adicional para factura
  if (documentType === 'factura') {
    if (!ruc || !businessName || !address) {
      return res.status(400).json({ error: 'Para factura es necesario RUC, Razón Social y Dirección' })
    }
    if (!/^\d{11}$/.test(ruc.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'El RUC debe tener 11 dígitos' })
    }
  }

  try {
    // Obtener el siguiente número de cotización
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { quoteNumber: 'desc' },
      where: { quoteNumber: { not: null } },
    })
    
    const nextQuoteNumber = lastQuote ? (lastQuote.quoteNumber || 0) + 1 : 1
    const quoteNumberFormatted = `#${nextQuoteNumber}` // Formato "#60"

    // Guardar en la base de datos (incluir documentType, datos fiscales y productos no encontrados en el JSON de products como metadata)
    const productsWithMetadata = {
      items: products,
      documentType: documentType || 'boleta',
      fiscalData: documentType === 'factura' ? {
        ruc: ruc.replace(/\D/g, ''),
        businessName,
        address,
      } : null,
      notFoundProducts: notFoundProducts && notFoundProducts.length > 0 
        ? notFoundProducts.filter(p => p.name && p.name.trim() !== '')
        : null,
    }
    
    const quote = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber,
        name,
        email,
        whatsapp,
        products: JSON.stringify(productsWithMetadata),
        total: parseFloat(total),
        status: 'pending',
      },
    })

    // Enviar a N8N webhook (solo si no se solicita omitir)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (skipWebhook) {
      console.log('⏭️ Omitiendo envío al webhook de N8N (skipWebhook: true)')
    } else {
      if (!n8nWebhookUrl) {
        console.warn('⚠️ N8N_WEBHOOK_URL no está configurada. El webhook no se enviará.')
        console.warn('   Para habilitar el webhook, configura la variable de entorno N8N_WEBHOOK_URL en Vercel o en tu archivo .env.local')
      } else {
        try {
          console.log('📤 Enviando cotización a N8N webhook...')
          console.log(`   URL: ${n8nWebhookUrl}`)
          console.log(`   Cliente: ${name} (${email})`)
          console.log(`   Cotización #${nextQuoteNumber}`)

          // Formatear productos para el carrito (formato que espera N8N)
          const carritoFormato = products.map(product => ({
            nombre: product.name || product.nombre || '',
            cantidad: product.quantity || product.cantidad || 1,
            precio: product.price || product.precio || 0
          }))

          // Formatear productos no encontrados
          const productosNoEncontradosFormato = notFoundProducts && notFoundProducts.length > 0
            ? notFoundProducts.filter(p => p.name && p.name.trim() !== '')
            : []

          // Generar PDF de la cotización
          console.log('   Generando PDF de la cotización...')
          const pdfBuffer = generateQuotePDF({
            ...quote,
            products: products, // Usar productos directamente
          })
          console.log('   ✅ PDF generado exitosamente')

          // Crear FormData para enviar datos JSON y PDF como archivo adjunto
          const formData = new FormData()
          
          // Agregar datos del cliente directamente (para acceso fácil en N8N)
          formData.append('name', name)
          formData.append('email', email)
          formData.append('phone', whatsapp)
          
          // Agregar campos adicionales para el email de N8N (acceso directo sin parsear JSON)
          formData.append('clientNombre', name || '')
          formData.append('numeroCotizacion', quoteNumberFormatted || `#${nextQuoteNumber}`)
          formData.append('quoteNumber', (nextQuoteNumber || 0).toString())
          formData.append('total', (parseFloat(total) || 0).toString())
          
          // Crear payload con estructura que N8N espera
          // IMPORTANTE: Para que N8N pueda acceder a $json.body.cliente.email,
          // necesitamos que el body sea un objeto, no un string JSON
          // Con multipart/form-data, N8N puede parsear automáticamente si usamos el formato correcto
          const bodyPayload = {
            cliente: {
              nombre: name,
              email: email,
              whatsapp: whatsapp,
            },
            carrito: carritoFormato,
            productosNoEncontrados: productosNoEncontradosFormato,
            quoteId: quote.id,
            quoteNumber: nextQuoteNumber,
            numeroCotizacion: quoteNumberFormatted,
            total: parseFloat(total),
            documentType: documentType || 'boleta',
            ruc: documentType === 'factura' ? ruc : null,
            businessName: documentType === 'factura' ? businessName : null,
            address: documentType === 'factura' ? address : null,
            createdAt: quote.createdAt.toISOString(),
          }
          
          // Enviar el body como JSON string - N8N lo parseará automáticamente si está configurado correctamente
          // Para que funcione con $json.body.cliente.email, N8N necesita parsear este campo
          formData.append('body', JSON.stringify(bodyPayload))
          
          // También enviamos el payload completo con estructura params/query/body para compatibilidad
          const webhookPayload = {
            params: {},
            query: {},
            body: bodyPayload,
          }
          formData.append('data', JSON.stringify(webhookPayload))
          
          // Agregar el PDF como archivo adjunto
          // Convertir Buffer a Uint8Array para compatibilidad con Blob
          const pdfUint8Array = new Uint8Array(pdfBuffer)
          const pdfBlob = new Blob([pdfUint8Array], { type: 'application/pdf' })
          const pdfFileName = `cotizacion - ${nextQuoteNumber}.pdf`
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
              throw new Error(`Webhook responded with status ${webhookResponse.status}: ${errorText}`)
            }

            const webhookData = await webhookResponse.json().catch(() => {
              console.warn('⚠️ No se pudo parsear la respuesta JSON del webhook')
              return null
            })
            
            console.log('✅ Webhook N8N respondió exitosamente')
            if (webhookData) {
              console.log('   Response data:', JSON.stringify(webhookData, null, 2))
            }
          } catch (fetchError) {
            clearTimeout(timeoutId)
            
            if (fetchError.name === 'AbortError') {
              console.error('❌ Timeout al enviar webhook a N8N (30 segundos)')
              console.error(`   URL: ${n8nWebhookUrl}`)
              throw new Error('Timeout: El webhook de N8N no respondió en 30 segundos')
            } else if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
              console.error('❌ Error de conexión con N8N webhook')
              console.error(`   URL: ${n8nWebhookUrl}`)
              console.error(`   Error: ${fetchError.message}`)
              throw new Error(`No se pudo conectar con el webhook de N8N: ${fetchError.message}`)
            } else {
              throw fetchError
            }
          }
      } catch (webhookError) {
        console.error('❌ Error sending to N8N webhook:', webhookError)
        console.error('   Error details:', {
          message: webhookError.message,
          stack: webhookError.stack,
          name: webhookError.name,
          code: webhookError.code,
        })
        console.error(`   URL del webhook: ${n8nWebhookUrl}`)
        // No fallar la petición si el webhook falla, pero loguear el error
      }
    }
  }

  // Incluir información sobre el estado del webhook en la respuesta
  const responseData = {
    message: 'Cotización enviada exitosamente',
    quoteId: quote.id,
  }

  // Si no hay webhook configurado, agregar advertencia
  if (!n8nWebhookUrl) {
    responseData.webhookWarning = 'N8N_WEBHOOK_URL no está configurada. El webhook no se envió.'
  }

  return res.status(201).json(responseData)
  } catch (error) {
    console.error('Error creating quote:', error)
    return res.status(500).json({ error: 'Error al crear cotización' })
  }
}

