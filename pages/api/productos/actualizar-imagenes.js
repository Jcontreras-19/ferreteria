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

// Función para buscar imagen de producto automáticamente
async function searchProductImage(productName) {
  try {
    // Limpiar el nombre del producto para la búsqueda
    const cleanName = productName
      .toLowerCase()
      .trim()
    
    if (!cleanName || cleanName.length < 2) {
      return null
    }
    
    // Buscar palabra clave en el mapeo
    let searchTerm = null
    for (const [keyword, term] of Object.entries(keywordMapping)) {
      if (cleanName.includes(keyword)) {
        searchTerm = term
        break
      }
    }
    
    // Si no hay mapeo, usar las primeras palabras del nombre
    if (!searchTerm) {
      const words = cleanName
        .replace(/[#\d"]/g, '')
        .split(' ')
        .filter(w => w.length > 2)
        .slice(0, 2)
        .join(' ')
      searchTerm = words || cleanName.substring(0, 15)
    }
    
    // Usar Unsplash Source API (gratuita, no requiere API key)
    // Formato: https://source.unsplash.com/400x400/?{search term}
    // Nota: Unsplash Source puede ser lento, pero es más confiable que placeholder
    const unsplashUrl = `https://source.unsplash.com/400x400/?${encodeURIComponent(searchTerm)}`
    
    return unsplashUrl
    
  } catch (error) {
    console.error('Error searching image:', error)
    // Fallback: usar Unsplash con término genérico
    const cleanName = productName.trim().substring(0, 20).replace(/[^a-zA-Z0-9\s]/g, '')
    // Usar Unsplash en lugar de placeholder para evitar problemas de carga
    return `https://source.unsplash.com/400x400/?tool,hardware`
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

    // Obtener todos los productos sin imagen
    const productsWithoutImage = await prisma.product.findMany({
      where: {
        OR: [
          { image: null },
          { image: '' }
        ]
      }
    })

    if (productsWithoutImage.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Todos los productos ya tienen imagen',
        updated: 0,
        total: 0
      })
    }

    let updated = 0
    let errors = 0

    // Actualizar cada producto sin imagen
    for (const product of productsWithoutImage) {
      try {
        const imageUrl = await searchProductImage(product.name)
        
        // Si la búsqueda falla, usar Unsplash con término genérico
        const finalImage = imageUrl || `https://source.unsplash.com/400x400/?tool,hardware`

        await prisma.product.update({
          where: { id: product.id },
          data: { image: finalImage }
        })

        updated++
      } catch (error) {
        console.error(`Error actualizando imagen para "${product.name}":`, error)
        errors++
      }
    }

    return res.json({
      success: true,
      message: `Imágenes actualizadas: ${updated} productos. ${errors > 0 ? `${errors} errores.` : ''}`,
      updated,
      errors,
      total: productsWithoutImage.length
    })
  } catch (error) {
    console.error('Error en actualizar-imagenes:', error)
    return res.status(500).json({ error: 'Error al actualizar imágenes' })
  }
}
