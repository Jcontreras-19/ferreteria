import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'

// Mapeo de palabras clave a términos de búsqueda de imágenes (mismo que en index.js)
const keywordMapping = {
  'martillo': 'hammer tool',
  'destornillador': 'screwdriver tool',
  'taladro': 'drill tool',
  'llave': 'wrench tool',
  'alicate': 'pliers tool',
  'sierra': 'saw tool',
  'nivel': 'level tool',
  'cinta métrica': 'measuring tape',
  'metro': 'measuring tape',
  'tornillo': 'screw hardware',
  'clavo': 'nail hardware',
  'tuerca': 'nut hardware',
  'abrazadera': 'clamp hardware',
  'pintura': 'paint bucket',
  'brocha': 'paint brush',
  'cable': 'electrical wire',
  'interruptor': 'light switch',
  'tubería': 'pipe plumbing',
  'grifo': 'faucet',
  'casco': 'hard hat',
  'guante': 'work gloves',
  'pegamento': 'glue',
  'silicona': 'silicone',
}

async function searchProductImage(productName) {
  try {
    const cleanName = productName.toLowerCase().trim()
    if (!cleanName || cleanName.length < 2) return null
    
    let searchTerm = null
    for (const [keyword, term] of Object.entries(keywordMapping)) {
      if (cleanName.includes(keyword)) {
        searchTerm = term
        break
      }
    }
    
    if (!searchTerm) {
      const words = cleanName.replace(/[#\d"]/g, '').split(' ').filter(w => w.length > 2).slice(0, 2).join(' ')
      searchTerm = words || cleanName.substring(0, 15)
    }
    
    // Intentar usar Unsplash API (requerido)
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!unsplashAccessKey) {
      console.log('⚠️ UNSPLASH_ACCESS_KEY no está configurada')
      return null
    }
    
    try {
      const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=landscape`
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Client-ID ${unsplashAccessKey}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const imageUrl = data.results[0].urls?.regular || data.results[0].urls?.small
          if (imageUrl) {
            console.log(`✅ Imagen encontrada en Unsplash para "${productName}": ${searchTerm}`)
            return imageUrl
          }
        } else {
          console.log(`⚠️ No se encontraron imágenes en Unsplash para "${searchTerm}"`)
        }
      } else {
        const errorText = await response.text()
        console.log(`⚠️ Unsplash API error (${response.status}): ${errorText.substring(0, 100)}`)
      }
    } catch (unsplashError) {
      console.log(`⚠️ Error con Unsplash API:`, unsplashError.message)
    }
    
    // Si Unsplash no funcionó, retornar null (no usar imágenes aleatorias)
    return null
  } catch (error) {
    console.error('Error searching image:', error)
    return null
  }
}
import { generateQuotePDF } from '../../../lib/pdfGenerator'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
      })

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' })
      }

      return res.status(200).json(product)
    } catch (error) {
      console.error('Error fetching product:', error)
      return res.status(500).json({ error: 'Error al obtener producto' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' })
      }

      // Solo administradores pueden editar productos
      const adminRoles = ['admin', 'superadmin']
      if (!adminRoles.includes(user.role?.toLowerCase())) {
        return res.status(403).json({ error: 'Solo administradores pueden editar productos' })
      }

      const { name, description, price, image, stock, category } = req.body

      if (!name || !price) {
        return res.status(400).json({ error: 'Nombre y precio son requeridos' })
      }

      // Obtener el producto actual antes de actualizarlo
      const currentProduct = await prisma.product.findUnique({
        where: { id },
      })

      if (!currentProduct) {
        return res.status(404).json({ error: 'Producto no encontrado' })
      }

      const newPrice = parseFloat(price)
      const oldPrice = currentProduct.price
      const priceChanged = oldPrice !== newPrice

      // Si no se proporciona imagen o está vacía, buscar una automáticamente
      let finalImage = image
      if (!finalImage || finalImage.trim() === '') {
        try {
          finalImage = await searchProductImage(name || currentProduct.name)
        } catch (error) {
          console.error('Error buscando imagen automática:', error)
          finalImage = currentProduct.image // Mantener la imagen actual si existe
        }
      }

      // Actualizar el producto
      const product = await prisma.product.update({
        where: { id },
        data: {
          name,
          description: description || null,
          price: newPrice,
          image: finalImage || null,
          stock: parseInt(stock) || 0,
          category: category || null,
        },
      })

      // Si el precio cambió, notificar a los clientes afectados
      if (priceChanged) {
        try {
          // Verificar variables de entorno ANTES de procesar
          const priceChangeWebhook = process.env.N8N_PRICE_CHANGE_WEBHOOK_URL
          const generalWebhook = process.env.N8N_WEBHOOK_URL
          
          console.log('🔍 [DEBUG] Variables de entorno al cambiar precio:')
          console.log('   N8N_PRICE_CHANGE_WEBHOOK_URL:', priceChangeWebhook ? `✅ ${priceChangeWebhook}` : '❌ NO CONFIGURADO')
          console.log('   N8N_WEBHOOK_URL:', generalWebhook ? `✅ ${generalWebhook}` : '❌ NO CONFIGURADO')
          
          // Priorizar webhook específico para cambios de precio
          const n8nWebhookUrl = priceChangeWebhook || generalWebhook
          
          console.log('   Webhook seleccionado:', n8nWebhookUrl ? `✅ ${n8nWebhookUrl}` : '❌ NINGUNO')
          
          // Buscar todas las cotizaciones que contengan este producto
          const allQuotes = await prisma.quote.findMany()
          const affectedQuotes = []

          for (const quote of allQuotes) {
            try {
              const productsData = JSON.parse(quote.products)
              // Compatible con formato antiguo y nuevo con metadata
              const products = productsData.items || productsData
              // Verificar si el producto está en esta cotización
              const productInQuote = products.find((p) => p.id === id)
              if (productInQuote) {
                affectedQuotes.push({
                  quote,
                  productInQuote,
                })
              }
            } catch (parseError) {
              console.error('Error parsing products in quote:', quote.id, parseError)
            }
          }

          if (n8nWebhookUrl && affectedQuotes.length > 0) {
            // Procesar cada cotización afectada: actualizar precios, generar PDF y enviar
            const notificationPromises = affectedQuotes.map(async ({ quote, productInQuote }) => {
              try {
                // Parsear productos de la cotización (compatible con formato antiguo y nuevo)
                const productsData = JSON.parse(quote.products)
                const quoteProducts = productsData.items || productsData
                const documentType = productsData.documentType || 'boleta'
                
                // Actualizar el precio del producto en la cotización
                const updatedProducts = quoteProducts.map((p) => {
                  if (p.id === id) {
                    return {
                      ...p,
                      price: newPrice, // Actualizar al nuevo precio
                    }
                  }
                  return p
                })

                // Recalcular el total de la cotización
                const newTotal = updatedProducts.reduce(
                  (sum, p) => sum + (p.price || 0) * (p.quantity || 0),
                  0
                )

                // Guardar con el formato correcto (mantener metadata si existe)
                const updatedProductsData = productsData.items 
                  ? { items: updatedProducts, documentType }
                  : updatedProducts

                // Actualizar la cotización en la base de datos con el nuevo precio y total
                const updatedQuote = await prisma.quote.update({
                  where: { id: quote.id },
                  data: {
                    products: JSON.stringify(updatedProductsData),
                    total: newTotal,
                  },
                })

                // Generar PDF actualizado de la cotización
                const pdfBuffer = generateQuotePDF({
                  ...updatedQuote,
                  products: updatedProducts, // Usar productos actualizados directamente
                })

                // Crear FormData para enviar al webhook (igual que el webhook de cotizaciones)
                const formData = new FormData()
                
                // Agregar campos del cliente
                formData.append('name', quote.name)
                formData.append('email', quote.email)
                formData.append('phone', quote.whatsapp || '')
                
                // Agregar información del cambio de precio
                formData.append('event', 'product_price_changed')
                formData.append('productId', product.id)
                formData.append('productName', product.name)
                formData.append('oldPrice', oldPrice.toString())
                formData.append('newPrice', newPrice.toString())
                formData.append('quoteId', quote.id)
                
                // Agregar el PDF actualizado como archivo adjunto
                const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
                const pdfFileName = `cotizacion-actualizada-${quote.id.slice(0, 8)}.pdf`
                formData.append('pdf', pdfBlob, pdfFileName)

                // Debug: confirmar URL antes de enviar
                console.log(`📤 [ENVÍO] Enviando PDF actualizado:`)
                console.log(`   URL del webhook: ${n8nWebhookUrl}`)
                console.log(`   Cotización ID: ${quote.id}`)
                console.log(`   Cliente: ${quote.email}`)
                console.log(`   ¿Es webhook de cambio de precio?: ${n8nWebhookUrl === priceChangeWebhook ? '✅ SÍ' : '❌ NO (usando webhook general)'}`)

                // Enviar al webhook de N8N
                const response = await fetch(n8nWebhookUrl, {
                  method: 'POST',
                  body: formData,
                })

                if (!response.ok) {
                  console.warn(`⚠️ N8N webhook responded with status ${response.status} for quote ${quote.id} (${quote.email})`)
                } else {
                  console.log(`✅ PDF actualizado enviado para cotización ${quote.id} a ${quote.email}`)
                  console.log(`   Webhook usado: ${n8nWebhookUrl}`)
                }
              } catch (error) {
                console.error(`Error procesando cotización ${quote.id} para ${quote.email}:`, error)
              }
            })

            // Ejecutar todas las notificaciones en paralelo (no bloquear la respuesta)
            Promise.all(notificationPromises).catch((error) => {
              console.error('Error en algunas notificaciones de cambio de precio:', error)
            })
          }
        } catch (notificationError) {
          // No fallar la actualización del producto si falla la notificación
          console.error('Error en el proceso de notificación de cambio de precio:', notificationError)
        }
      }

      return res.status(200).json(product)
    } catch (error) {
      console.error('Error updating product:', error)
      return res.status(500).json({ error: 'Error al actualizar producto' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' })
      }

      // Solo administradores pueden eliminar productos
      const adminRoles = ['admin', 'superadmin']
      if (!adminRoles.includes(user.role?.toLowerCase())) {
        return res.status(403).json({ error: 'Solo administradores pueden eliminar productos' })
      }

      await prisma.product.delete({
        where: { id },
      })

      return res.status(200).json({ message: 'Producto eliminado' })
    } catch (error) {
      console.error('Error deleting product:', error)
      return res.status(500).json({ error: 'Error al eliminar producto' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

