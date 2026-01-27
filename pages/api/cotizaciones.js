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

    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json(quotes)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return res.status(500).json({ error: 'Error al obtener cotizaciones' })
  }
}

