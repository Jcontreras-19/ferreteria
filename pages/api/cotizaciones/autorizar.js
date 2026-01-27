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

    // Solo admin y superadmin pueden ver cotizaciones para autorizar
    const allowedRoles = ['admin', 'superadmin']
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    // Obtener solo cotizaciones aprobadas (pendientes de autorización)
    const { dateFrom, dateTo } = req.query
    let where = {
      status: 'approved',
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    // Agregar información de stock para cada producto
    const quotesWithStock = await Promise.all(quotes.map(async (quote) => {
      try {
        const productsData = JSON.parse(quote.products)
        const products = productsData.items || productsData
        const productIds = products.map(p => p.id)

        const productsWithStock = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, stock: true, description: true }
        })

        const productsInfo = products.map(p => {
          const productInfo = productsWithStock.find(ps => ps.id === p.id)
          const requestedQuantity = p.quantity || p.cantidad || 1 // Manejar diferentes nombres de campo
          const availableStock = productInfo?.stock || 0
          const inStock = availableStock >= requestedQuantity
          
          return {
            ...p,
            stock: availableStock,
            quantity: requestedQuantity, // Asegurar que quantity esté definido
            inStock: inStock,
            description: productInfo?.description || p.description || '',
          }
        })
        
        // Calcular estado de stock considerando solo productos encontrados
        const foundProducts = productsInfo.filter(p => productsWithStock.some(ps => ps.id === p.id))
        const allInStock = foundProducts.length > 0 && foundProducts.every(p => p.inStock)
        const someInStock = foundProducts.some(p => p.inStock)
        
        return {
          ...quote,
          productsParsed: productsInfo,
          allInStock: allInStock,
          someInStock: someInStock,
        }
      } catch (e) {
        console.error(`Error parsing products for quote ${quote.id}:`, e)
        return { ...quote, productsParsed: [], allInStock: false, someInStock: false }
      }
    }))

    return res.status(200).json(quotesWithStock)
  } catch (error) {
    console.error('Error fetching quotes for authorization:', error)
    return res.status(500).json({ error: 'Error al obtener cotizaciones para autorización' })
  }
}
