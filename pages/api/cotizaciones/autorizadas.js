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

    // Admin, superadmin y cotizador pueden ver boletas/facturas
    const allowedRoles = ['admin', 'superadmin', 'cotizador', 'vendedor']
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const { dateFrom, dateTo } = req.query
    let where = {
      status: 'authorized',
    }

    if (dateFrom || dateTo) {
      where.authorizedAt = {}
      if (dateFrom) {
        where.authorizedAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.authorizedAt.lte = endDate
      }
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { authorizedAt: 'desc' },
    })

    // Agregar información de productos parseados
    const quotesWithProducts = quotes.map(quote => {
      try {
        const productsData = JSON.parse(quote.products)
        const products = productsData.items || productsData
        return {
          ...quote,
          productsParsed: products,
        }
      } catch (e) {
        return {
          ...quote,
          productsParsed: [],
        }
      }
    })

    return res.status(200).json(quotesWithProducts)
  } catch (error) {
    console.error('Error fetching authorized quotes:', error)
    return res.status(500).json({ error: 'Error al obtener boletas y facturas' })
  }
}
