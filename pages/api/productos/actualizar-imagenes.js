import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'

// Mapeo de palabras clave a términos de búsqueda de imágenes
const keywordMapping = {
  // Herramientas Manuales
  'martillo': 'hammer tool',
  'destornillador': 'screwdriver tool',
  'taladro': 'drill tool',
  'llave': 'wrench tool',
  'alicate': 'pliers tool',
  'sierra': 'saw tool',
  'nivel': 'level tool',
  'cinta métrica': 'measuring tape',
  'metro': 'measuring tape',
  'escalera': 'ladder',
  'andamio': 'scaffolding',
  'pala': 'shovel tool',
  'azada': 'hoe tool',
  'rastrillo': 'rake tool',
  'machete': 'machete tool',
  'hacha': 'axe tool',
  'formón': 'chisel tool',
  'lima': 'file tool',
  
  // Herramientas Eléctricas
  'amoladora': 'angle grinder',
  'lijadora': 'sander tool',
  'pulidora': 'polisher tool',
  'soldadora': 'welder tool',
  'caladora': 'jigsaw tool',
  'sierra circular': 'circular saw',
  
  // Materiales y Hardware
  'tornillo': 'screw hardware',
  'clavo': 'nail hardware',
  'tuerca': 'nut hardware',
  'arandela': 'washer hardware',
  'abrazadera': 'clamp hardware',
  'abrazadera unicanal': 'pipe clamp',
  'abrazadera cremallera': 'hose clamp',
  'abrazadera omega': 'pvc clamp',
  'abrazadera tipo u': 'u clamp',
  'perno': 'bolt hardware',
  'remache': 'rivet hardware',
  'grapa': 'staple hardware',
  'tachuela': 'tack hardware',
  
  // Pintura y Acabados
  'pintura': 'paint bucket',
  'brocha': 'paint brush',
  'rodillo': 'paint roller',
  'lija': 'sandpaper',
  'masilla': 'putty',
  'sellador': 'sealant',
  'enduido': 'spackle',
  'barniz': 'varnish',
  'esmalte': 'enamel paint',
  
  // Electricidad
  'cable': 'electrical wire',
  'interruptor': 'light switch',
  'enchufe': 'electrical plug',
  'bombilla': 'light bulb',
  'foco': 'light bulb',
  'lámpara': 'lamp',
  'portalámpara': 'lamp holder',
  'fusible': 'fuse',
  'caja': 'electrical box',
  
  // Fontanería
  'tubería': 'pipe plumbing',
  'grifo': 'faucet',
  'válvula': 'valve',
  'manguera': 'hose',
  'llave': 'faucet',
  'sifón': 'siphon',
  'desagüe': 'drain',
  'caño': 'pipe',
  
  // Seguridad
  'casco': 'hard hat',
  'guante': 'work gloves',
  'gafas': 'safety glasses',
  'mascarilla': 'safety mask',
  'chaleco': 'safety vest',
  'arnés': 'safety harness',
  'botas': 'safety boots',
  
  // Adhesivos y Químicos
  'pegamento': 'glue',
  'silicona': 'silicone',
  'adhesivo': 'adhesive',
  'cola': 'glue',
  'cemento': 'cement',
  'cal': 'lime',
  'arena': 'sand',
  'arena fina': 'fine sand',
  'arena zarandeada': 'sifted sand',
  'arena cantera': 'quarry sand',
  'arena tarrajeo': 'plastering sand',
  'grava': 'gravel',
  
  // Construcción
  'ladrillo': 'brick',
  'bloque': 'concrete block',
  'cemento': 'cement',
  'yeso': 'plaster',
  'malla': 'mesh',
  'alambre': 'wire',
  'varilla': 'rebar',
  
  // Otros
  'candado': 'padlock',
  'bisagra': 'hinge',
  'cerradura': 'lock',
  'manija': 'handle',
  'perilla': 'knob',
}

// Función para buscar imagen de producto automáticamente usando Unsplash API
async function searchProductImage(productName) {
  try {
    // Limpiar el nombre del producto para la búsqueda
    const cleanName = productName
      .toLowerCase()
      .trim()
    
    if (!cleanName || cleanName.length < 2) {
      return null
    }
    
    // Palabras a excluir de la búsqueda
    const stopWords = ['para', 'tipo', 'de', 'del', 'la', 'las', 'los', 'el', 'y', 'con', 'con', 'sin', 'un', 'una', 'unos', 'unas', 'en', 'por', 'sobre', 'entre', 'hasta', 'desde', 'hacia', 'según', 'durante', 'mediante', 'kg', 'ml', 'l', 'm3', 'm2', 'cm', 'mm', 'g', 'gr', 'pulg', 'pulgadas', 'saco', 'bolsa', 'unidad', 'unidades']
    
    // Buscar palabra clave en el mapeo (buscar coincidencias más largas primero)
    let searchTerm = null
    const sortedKeywords = Object.entries(keywordMapping).sort((a, b) => b[0].length - a[0].length)
    
    for (const [keyword, term] of sortedKeywords) {
      if (cleanName.includes(keyword)) {
        // Extraer palabras adicionales del nombre completo para hacer la búsqueda más específica
        const nameWords = cleanName
          .replace(keyword, '')
          .replace(/[#\d"()]/g, '') // Remover números, comillas y paréntesis
          .split(' ')
          .filter(w => w.length > 2 && !stopWords.includes(w))
          .slice(0, 3) // Tomar hasta 3 palabras adicionales para mayor especificidad
        
        if (nameWords.length > 0) {
          // Combinar el término mapeado con palabras adicionales del nombre
          searchTerm = `${term} ${nameWords.join(' ')}`
        } else {
          searchTerm = term
        }
        break
      }
    }
    
    // Si no hay mapeo, usar las palabras más relevantes del nombre completo
    if (!searchTerm) {
      const words = cleanName
        .replace(/[#\d"()]/g, '')
        .split(' ')
        .filter(w => w.length > 2 && !stopWords.includes(w))
        .slice(0, 4) // Tomar hasta 4 palabras para ser más específico
        .join(' ')
      searchTerm = words || cleanName.substring(0, 30)
    }
    
    // Crear un hash único del nombre completo para evitar repeticiones
    // Este hash se usará para seleccionar diferentes imágenes de los resultados
    const nameHash = productName.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)
    
    // Intentar usar Unsplash API (requerido)
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!unsplashAccessKey) {
      console.log(`⚠️ UNSPLASH_ACCESS_KEY no está configurada para "${productName}"`)
      return null
    }
    
    // Intentar buscar imagen en Unsplash
    try {
      // BÚSQUEDA PRINCIPAL: Usar el término específico y obtener múltiples resultados
      // Luego seleccionar uno diferente basado en el hash del nombre completo
      const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=20&orientation=landscape`
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Client-ID ${unsplashAccessKey}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          // Usar un índice basado en el hash para seleccionar diferentes imágenes
          // Esto asegura que productos similares no tengan la misma imagen
          // Usar hasta 10 resultados para tener más variedad
          const maxResults = Math.min(data.results.length, 10)
          const imageIndex = Math.abs(nameHash) % maxResults
          const selectedImage = data.results[imageIndex]
          const imageUrl = selectedImage.urls?.regular || selectedImage.urls?.small
          if (imageUrl) {
            console.log(`✅ Imagen encontrada en Unsplash para "${productName}": "${searchTerm}" (índice ${imageIndex + 1}/${maxResults})`)
            return imageUrl
          }
        } else {
          console.log(`⚠️ No se encontraron imágenes en Unsplash para "${searchTerm}"`)
        }
      } else {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch (e) {
          errorText = 'No se pudo leer el error'
        }
        console.log(`⚠️ Unsplash API error (${response.status}) para "${productName}": ${errorText.substring(0, 200)}`)
        
        // Si es un error de autenticación o rate limit, lanzar error crítico
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Unsplash API: Error de autenticación (${response.status}). Verifica tu UNSPLASH_ACCESS_KEY en Vercel.`)
        }
        if (response.status === 429) {
          throw new Error(`Unsplash API: Rate limit excedido (429). Has alcanzado el límite de peticiones. Espera antes de intentar nuevamente.`)
        }
        // Para otros errores, solo loguear y continuar (retornar null)
      }
    } catch (unsplashError) {
      console.log(`⚠️ Error con Unsplash API para "${productName}":`, unsplashError.message)
      // Re-lanzar solo errores críticos (autenticación o rate limit)
      if (unsplashError.message && (
        unsplashError.message.includes('autenticación') || 
        unsplashError.message.includes('Rate limit') ||
        unsplashError.message.includes('401') ||
        unsplashError.message.includes('403') ||
        unsplashError.message.includes('429')
      )) {
        throw unsplashError
      }
      // Para otros errores, continuar sin imagen
    }
    
    // Si Unsplash no funcionó, retornar null (no usar imágenes aleatorias)
    console.log(`⚠️ No se pudo obtener imagen de Unsplash para "${productName}" con término "${searchTerm}"`)
    return null
    
  } catch (error) {
    console.error('Error searching image:', error)
    return null
  }
}

export default async function handler(req, res) {
  // Establecer Content-Type para todas las respuestas
  res.setHeader('Content-Type', 'application/json')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Verificar autenticación - Solo administradores
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Solo admin y superadmin pueden actualizar imágenes
    const adminRoles = ['admin', 'superadmin']
    if (!adminRoles.includes(user.role?.toLowerCase())) {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar imágenes' })
    }

    // Verificar que la API key esté configurada antes de empezar
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!unsplashAccessKey) {
      return res.status(400).json({
        success: false,
        error: 'UNSPLASH_ACCESS_KEY no está configurada',
        message: 'Por favor configura la variable de entorno UNSPLASH_ACCESS_KEY en Vercel o tu archivo .env.local'
      })
    }

    // Obtener parámetros del lote (batch processing)
    const { batch = 1, batchSize = 30 } = req.body
    const skip = (batch - 1) * batchSize
    const take = batchSize

    // Obtener productos que necesitan actualización (solo el lote actual)
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      },
      orderBy: { id: 'asc' }
    })

    // Filtrar productos que necesitan actualización
    const productsNeedingUpdate = allProducts.filter(product => {
      if (!product.image || product.image.trim() === '') return true
      if (product.image.includes('via.placeholder.com')) return true
      if (product.image.includes('source.unsplash.com')) return true
      if (product.image.includes('unsplash.com') && !product.image.includes('images.unsplash.com')) return true
      return false
    })

    const totalNeedingUpdate = productsNeedingUpdate.length

    if (totalNeedingUpdate === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Todos los productos ya tienen imagen válida',
        updated: 0,
        total: 0,
        hasMore: false,
        currentBatch: batch,
        totalBatches: 0
      })
    }

    // Obtener solo el lote actual de productos a procesar
    const productsToUpdate = productsNeedingUpdate.slice(skip, skip + take)
    const totalBatches = Math.ceil(totalNeedingUpdate / batchSize)
    const hasMore = batch < totalBatches

    if (productsToUpdate.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No hay más productos para procesar en este lote',
        updated: 0,
        total: totalNeedingUpdate,
        hasMore: false,
        currentBatch: batch,
        totalBatches
      })
    }

    let updated = 0
    let errors = 0
    let criticalError = null

    // Actualizar cada producto del lote actual
    const delayBetweenRequests = 1000 // 1 segundo entre peticiones

    for (const product of productsToUpdate) {
      try {
        // Si hay un error crítico (rate limit o autenticación), detener el proceso
        if (criticalError) {
          break
        }

        const imageUrl = await searchProductImage(product.name)
        
        // Si la búsqueda falla, dejar null (no asignar imagen aleatoria)
        const finalImage = imageUrl || null

        // Actualizar el producto en la base de datos
        await prisma.product.update({
          where: { id: product.id },
          data: { image: finalImage }
        })

        if (finalImage) {
          updated++
          console.log(`✅ Imagen asignada a "${product.name}": ${finalImage.substring(0, 50)}...`)
        } else {
          console.log(`⚠️ No se encontró imagen para "${product.name}"`)
        }
        
        // Pausa entre peticiones para cumplir términos de Unsplash
        if (productsToUpdate.indexOf(product) < productsToUpdate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
        }
      } catch (error) {
        console.error(`Error actualizando imagen para "${product.name}":`, error)
        
        // Detectar errores críticos que deben detener el proceso
        if (error.message && (
          error.message.includes('autenticación') || 
          error.message.includes('Rate limit') ||
          error.message.includes('401') ||
          error.message.includes('403') ||
          error.message.includes('429')
        )) {
          criticalError = error.message
          console.error('❌ Error crítico detectado:', error.message)
          break
        }
        
        errors++
        // Pausa también en caso de error
        if (productsToUpdate.indexOf(product) < productsToUpdate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
        }
      }
    }

    // Si hubo un error crítico, informarlo
    if (criticalError) {
      return res.status(500).json({
        success: false,
        error: 'Error crítico durante la actualización',
        message: criticalError,
        updated,
        errors,
        total: totalNeedingUpdate,
        processedInBatch: productsToUpdate.length,
        hasMore,
        currentBatch: batch,
        totalBatches
      })
    }

    // Calcular productos sin imagen en este lote
    const productsWithoutImage = productsToUpdate.length - updated - errors

    return res.status(200).json({
      success: true,
      message: `✅ Lote ${batch}/${totalBatches} completado: ${updated} con imagen, ${productsWithoutImage} sin imagen, ${errors} errores.`,
      updated,
      withoutImage: productsWithoutImage,
      errors,
      total: totalNeedingUpdate,
      processedInBatch: productsToUpdate.length,
      hasMore,
      currentBatch: batch,
      totalBatches
    })
  } catch (error) {
    console.error('Error en actualizar-imagenes:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Error al actualizar imágenes',
      message: error.message || 'Error desconocido',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
