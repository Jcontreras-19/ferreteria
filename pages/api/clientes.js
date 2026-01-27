import { prisma } from '../../lib/prisma'
import { getCurrentUser } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Solo administradores pueden ver clientes
    const adminRoles = ['admin', 'superadmin', 'editor', 'viewer']
    if (!adminRoles.includes(user.role)) {
      return res.status(403).json({ error: 'No tienes permisos' })
    }

    // Obtener todos los clientes (role = 'customer')
    const customers = await prisma.user.findMany({
      where: {
        role: 'customer',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Obtener todas las cotizaciones para relacionarlas con los clientes
    const quotes = await prisma.quote.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        total: true,
        status: true,
        createdAt: true,
      },
    })

    // Agregar información de cotizaciones a cada cliente
    const customersWithQuotes = customers.map((customer) => {
      const customerQuotes = quotes.filter((quote) => quote.email === customer.email)
      const totalQuotes = customerQuotes.length
      const totalSpent = customerQuotes.reduce((sum, quote) => sum + quote.total, 0)
      const lastQuoteDate = customerQuotes.length > 0
        ? customerQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
        : null

      return {
        ...customer,
        totalQuotes,
        totalSpent,
        lastQuoteDate,
        quotes: customerQuotes.map((q) => ({
          id: q.id,
          total: q.total,
          status: q.status,
          createdAt: q.createdAt,
        })),
      }
    })

    return res.status(200).json(customersWithQuotes)
  } catch (error) {
    console.error('Error fetching customers:', error)
    return res.status(500).json({ error: 'Error al obtener clientes' })
  }
}

