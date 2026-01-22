import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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
      return res.status(403).json({ error: 'No autorizado' })
    }

    const { status, search } = req.query

    // Construir filtros
    const where = {}
    
    if (status && status !== 'all') {
      where.status = status
    }
    // Si status es 'all' o no se especifica, no agregamos filtro de status

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search, mode: 'insensitive' } },
      ]
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Obtener información de stock para cada producto en las cotizaciones
    const quotesWithStock = await Promise.all(quotes.map(async (quote) => {
      try {
        // Parsear productos (compatible con formato antiguo y nuevo)
        const productsData = typeof quote.products === 'string' 
          ? JSON.parse(quote.products) 
          : quote.products
        
        // Obtener el array de productos (puede estar en items o ser el array directamente)
        const products = productsData.items || productsData
        
        // Asegurarse de que es un array
        if (!Array.isArray(products) || products.length === 0) {
          return {
            ...quote,
            productsParsed: [],
            allInStock: false,
            someInStock: false,
          }
        }
        
        // Obtener IDs de productos válidos
        const productIds = products
          .map(p => p.id)
          .filter(id => id) // Filtrar IDs nulos o undefined
        
        if (productIds.length === 0) {
          return {
            ...quote,
            productsParsed: products, // Devolver productos sin información de stock
            allInStock: false,
            someInStock: false,
          }
        }
        
        const productsWithStock = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, stock: true }
        })

        const productsInfo = products.map(p => {
          const productInfo = productsWithStock.find(ps => ps.id === p.id)
          return {
            ...p,
            stock: productInfo?.stock || 0,
            inStock: (productInfo?.stock || 0) >= (p.quantity || 1)
          }
        })

        return {
          ...quote,
          productsParsed: productsInfo,
          allInStock: productsInfo.every(p => p.inStock),
          someInStock: productsInfo.some(p => p.inStock),
        }
      } catch (error) {
        console.error('Error parsing products for quote:', quote.id, error)
        return {
          ...quote,
          productsParsed: [],
          allInStock: false,
          someInStock: false,
        }
      }
    }))

    return res.status(200).json(quotesWithStock)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return res.status(500).json({ error: 'Error al obtener cotizaciones' })
  }
}
