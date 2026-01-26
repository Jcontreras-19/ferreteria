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
    
    if (unsplashAccessKey) {
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
          
          // Si es un error de autenticación o rate limit, detener el proceso
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Unsplash API: Error de autenticación (${response.status}). Verifica tu UNSPLASH_ACCESS_KEY.`)
          }
          if (response.status === 429) {
            throw new Error(`Unsplash API: Rate limit excedido. Espera antes de intentar nuevamente.`)
          }
        }
      } catch (unsplashError) {
        console.log(`⚠️ Error con Unsplash API:`, unsplashError.message)
        // Re-lanzar errores críticos
        if (unsplashError.message.includes('autenticación') || unsplashError.message.includes('Rate limit')) {
          throw unsplashError
        }
      }
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

    // Obtener TODOS los productos para verificar y actualizar si tienen URLs rotas
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    })

    // Filtrar productos que necesitan actualización
    const productsToUpdate = allProducts.filter(product => {
      if (!product.image || product.image.trim() === '') return true
      if (product.image.includes('via.placeholder.com')) return true
      if (product.image.includes('source.unsplash.com')) return true
      if (product.image.includes('unsplash.com') && !product.image.includes('images.unsplash.com')) return true
      return false
    })

    if (productsToUpdate.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Todos los productos ya tienen imagen válida',
        updated: 0,
        total: 0
      })
    }

    let updated = 0
    let errors = 0

    // Actualizar cada producto que necesita imagen
    // Rate limiting: pausa entre peticiones para cumplir términos de Unsplash
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY
    const delayBetweenRequests = unsplashAccessKey ? 1000 : 0 // 1 segundo si usa Unsplash

    for (const product of productsToUpdate) {
      try {
        const imageUrl = await searchProductImage(product.name)
        
        // Si la búsqueda falla, dejar null (no asignar imagen aleatoria)
        const finalImage = imageUrl || null

        await prisma.product.update({
          where: { id: product.id },
          data: { image: finalImage }
        })

        updated++
        
        // Pausa entre peticiones para cumplir términos de Unsplash (máx 50 requests/hora por defecto)
        // Con 768 productos, esto tomará aproximadamente 13 minutos si usa Unsplash
        if (updated < productsToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
        }
        
        // Log de progreso cada 50 productos
        if (updated % 50 === 0) {
          console.log(`Progreso: ${updated}/${productsToUpdate.length} productos actualizados`)
        }
      } catch (error) {
        console.error(`Error actualizando imagen para "${product.name}":`, error)
        errors++
        // Pausa también en caso de error
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
      }
    }

    return res.json({
      success: true,
      message: `✅ Imágenes actualizadas: ${updated} de ${productsToUpdate.length} productos. ${errors > 0 ? `${errors} errores.` : ''}`,
      updated,
      errors,
      total: productsToUpdate.length
    })
  } catch (error) {
    console.error('Error en actualizar-imagenes:', error)
    return res.status(500).json({ 
      error: 'Error al actualizar imágenes',
      message: error.message || 'Error desconocido',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
