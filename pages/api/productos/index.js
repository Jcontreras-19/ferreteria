import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'

// Importar la función de búsqueda de imágenes desde actualizar-imagenes
// Mapeo de palabras clave a términos de búsqueda de imágenes
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

// Función para buscar imagen de producto automáticamente
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
    
    // Intentar usar Unsplash API primero (si está configurada)
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY
    if (unsplashAccessKey) {
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
            if (imageUrl) return imageUrl
          }
        }
      } catch (unsplashError) {
        console.log(`Unsplash API error, usando fallback:`, unsplashError.message)
      }
    }
    
    // Fallback: usar Picsum Photos
    return `https://picsum.photos/seed/${encodeURIComponent(searchTerm)}/400/400`
  } catch (error) {
    const randomId = Math.floor(Math.random() * 1000) + 1
    return `https://picsum.photos/400/400?random=${randomId}`
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { search, category, page = '1', limit = '10' } = req.query
      const pageNum = parseInt(page) || 1
      const limitNum = parseInt(limit) || 10
      const skip = (pageNum - 1) * limitNum

      let where = {}

      if (search) {
        // Búsqueda en nombre y descripción
        where = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      }

      if (category) {
        // Filtro por categoría
        if (where.OR) {
          // Si ya hay un filtro de búsqueda, combinarlos con AND
          where = {
            AND: [
              where,
              { category: { equals: category, mode: 'insensitive' } }
            ]
          }
        } else {
          where.category = { equals: category, mode: 'insensitive' }
        }
      }

      // Obtener el total de productos para la paginación
      const totalProducts = await prisma.product.count({ where })

      // Obtener todos los productos ordenados por fecha de creación (más antiguos primero)
      const allProducts = await prisma.product.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      })

      // Ordenar: productos con imagen primero, pero manteniendo el orden cronológico dentro de cada grupo
      // Los productos nuevos se agregan al final (createdAt más reciente = último)
      const sortedProducts = allProducts.sort((a, b) => {
        const aHasImage = a.image && a.image.trim() !== ''
        const bHasImage = b.image && b.image.trim() !== ''
        
        // Primero ordenar por imagen (con imagen primero)
        if (aHasImage && !bHasImage) return -1
        if (!aHasImage && bHasImage) return 1
        
        // Si ambos tienen imagen o ambos no tienen, mantener orden cronológico ascendente
        // Los productos más antiguos primero, los nuevos al final
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateA - dateB
      })

      // Aplicar paginación
      const products = sortedProducts.slice(skip, skip + limitNum)
      const totalPages = Math.ceil(totalProducts / limitNum)

      return res.status(200).json({
        products,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      })
    } catch (error) {
      console.error('Error fetching products:', error)
      return res.status(500).json({ error: 'Error al obtener productos' })
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' })
      }

      // Solo administradores pueden crear productos
      const adminRoles = ['admin', 'superadmin']
      if (!adminRoles.includes(user.role?.toLowerCase())) {
        return res.status(403).json({ error: 'Solo administradores pueden crear productos' })
      }

      const { name, description, price, image, stock, category } = req.body

      if (!name || !price) {
        return res.status(400).json({ error: 'Nombre y precio son requeridos' })
      }

      // Si no se proporciona imagen, buscar una automáticamente
      let finalImage = image
      if (!finalImage || finalImage.trim() === '') {
        try {
          finalImage = await searchProductImage(name)
        } catch (error) {
          console.error('Error buscando imagen automática:', error)
          // Si falla, dejar null para que se asigne después
          finalImage = null
        }
      }

      const product = await prisma.product.create({
        data: {
          name,
          description: description || null,
          price: parseFloat(price),
          image: finalImage || null,
          stock: parseInt(stock) || 0,
          category: category || null,
        },
      })

      return res.status(201).json(product)
    } catch (error) {
      console.error('Error creating product:', error)
      return res.status(500).json({ error: 'Error al crear producto' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

