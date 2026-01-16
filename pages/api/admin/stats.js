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

    // Obtener parámetros de filtro de período
    const { period = 'month' } = req.query // 'week', 'month', 'year'
    
    // Calcular fechas según el período
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1) // Mes actual
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1) // Año actual
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Estadísticas generales
    const [
      totalProducts,
      totalQuotes,
      totalUsers,
      totalClients,
      products,
      quotes,
      allQuotes,
      clients,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.quote.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          role: {
            notIn: ['admin', 'superadmin', 'editor', 'viewer', 'cotizador', 'vendedor'],
          },
        },
      }),
      prisma.product.findMany({
        select: { id: true, name: true, price: true, stock: true, category: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quote.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: { id: true, total: true, createdAt: true, status: true, products: true, email: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quote.findMany({
        select: { id: true, total: true, createdAt: true, status: true, products: true, email: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        where: {
          role: {
            notIn: ['admin', 'superadmin', 'editor', 'viewer', 'cotizador', 'vendedor'],
          },
        },
        select: { id: true, createdAt: true },
      }),
    ])


    // Generar datos según el período seleccionado
    let timeSeriesData = []
    let timeLabels = []
    
    if (period === 'week') {
      // Últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayKey = date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
        timeLabels.push(dayKey)
        timeSeriesData.push({ date: dayKey, count: 0, revenue: 0 })
      }
      
      quotes.forEach((quote) => {
        const quoteDate = new Date(quote.createdAt)
        const daysDiff = Math.floor((now - quoteDate) / (1000 * 60 * 60 * 24))
        if (daysDiff >= 0 && daysDiff <= 6) {
          const index = 6 - daysDiff
          if (timeSeriesData[index]) {
            timeSeriesData[index].count++
            timeSeriesData[index].revenue += quote.total
          }
        }
      })
    } else if (period === 'month') {
      // Últimos 30 días o semanas del mes
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const weeks = Math.ceil(daysInMonth / 7)
      for (let i = 0; i < weeks; i++) {
        const weekNum = i + 1
        timeLabels.push(`Semana ${weekNum}`)
        timeSeriesData.push({ date: `Semana ${weekNum}`, count: 0, revenue: 0 })
      }
      
      quotes.forEach((quote) => {
        const quoteDate = new Date(quote.createdAt)
        if (quoteDate.getMonth() === now.getMonth() && quoteDate.getFullYear() === now.getFullYear()) {
          const weekNum = Math.ceil(quoteDate.getDate() / 7) - 1
          if (timeSeriesData[weekNum]) {
            timeSeriesData[weekNum].count++
            timeSeriesData[weekNum].revenue += quote.total
          }
        }
      })
    } else if (period === 'year') {
      // Últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })
        timeLabels.push(monthKey)
        timeSeriesData.push({ date: monthKey, count: 0, revenue: 0 })
      }
      
      quotes.forEach((quote) => {
        const quoteDate = new Date(quote.createdAt)
        const monthsDiff = (now.getFullYear() - quoteDate.getFullYear()) * 12 + (now.getMonth() - quoteDate.getMonth())
        if (monthsDiff >= 0 && monthsDiff <= 11) {
          const index = 11 - monthsDiff
          if (timeSeriesData[index]) {
            timeSeriesData[index].count++
            timeSeriesData[index].revenue += quote.total
          }
        }
      })
    }

    // Estadísticas de cotizaciones por mes (últimos 6 meses) - para gráfico histórico
    const monthlyQuotes = {}
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyQuotes[monthKey] = 0
    }

    allQuotes.forEach((quote) => {
      const date = new Date(quote.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthlyQuotes[monthKey] !== undefined) {
        monthlyQuotes[monthKey]++
      }
    })

    const monthlyData = Object.entries(monthlyQuotes).map(([month, count]) => ({
      month,
      count,
    }))

    // Total de ingresos (suma de cotizaciones del período)
    const totalRevenue = quotes.reduce((sum, quote) => sum + quote.total, 0)
    
    // Ingresos totales históricos
    const totalRevenueAll = allQuotes.reduce((sum, quote) => sum + quote.total, 0)

    // Cotizaciones por estado
    const quotesByStatus = {
      pending: quotes.filter((q) => q.status === 'pending').length,
      approved: quotes.filter((q) => q.status === 'approved').length,
      authorized: quotes.filter((q) => q.status === 'authorized').length,
      sent: quotes.filter((q) => q.status === 'sent').length,
      completed: quotes.filter((q) => q.status === 'completed').length,
      rejected: quotes.filter((q) => q.status === 'rejected').length,
    }

    // Calcular productos más cotizados (usando todas las cotizaciones)
    const productCounts = {}
    allQuotes.forEach((quote) => {
      try {
        const quoteProducts = typeof quote.products === 'string' ? JSON.parse(quote.products) : quote.products
        const items = quoteProducts.items || (Array.isArray(quoteProducts) ? quoteProducts : [])
        if (Array.isArray(items)) {
          items.forEach((product) => {
            if (product.id) {
              productCounts[product.id] = (productCounts[product.id] || 0) + 1
            }
          })
        }
      } catch (e) {
        // Ignorar errores
      }
    })

    const topProducts = Object.entries(productCounts)
      .map(([productId, count]) => {
        const product = products.find((p) => p.id === productId)
        return product ? { name: product.name, quoteCount: count } : null
      })
      .filter(Boolean)
      .sort((a, b) => b.quoteCount - a.quoteCount)
      .slice(0, 10)

    // Estadísticas de clientes - contar clientes únicos que tienen cotizaciones
    const uniqueClients = new Set()
    allQuotes.forEach(quote => {
      if (quote.email) {
        uniqueClients.add(quote.email)
      }
    })
    const clientsWithQuotes = uniqueClients.size

    // Ingresos por mes (para gráfico de ingresos)
    const revenueByMonth = {}
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      revenueByMonth[monthKey] = 0
    }

    allQuotes.forEach((quote) => {
      const date = new Date(quote.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (revenueByMonth[monthKey] !== undefined) {
        revenueByMonth[monthKey] += quote.total
      }
    })

    const revenueData = Object.entries(revenueByMonth).map(([month, revenue]) => ({
      month,
      revenue: parseFloat(revenue.toFixed(2)),
    }))

    // Productos con bajo stock
    const lowStockProducts = products.filter(p => (p.stock || 0) < 10).length

    // Promedio de cotización
    const avgQuoteValue = quotes.length > 0 ? totalRevenue / quotes.length : 0

    return res.status(200).json({
      totalProducts,
      totalQuotes,
      totalUsers,
      totalClients,
      totalRevenue,
      totalRevenueAll,
      topProducts,
      monthlyData,
      timeSeriesData,
      revenueData,
      quotesByStatus,
      clientsWithQuotes,
      lowStockProducts,
      avgQuoteValue,
      period,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
}

