import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PUT') {
    try {
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' })
      }

      const { status } = req.body

      if (!status || !['pending', 'sent', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' })
      }

      const quote = await prisma.quote.update({
        where: { id },
        data: { status },
      })

      return res.status(200).json(quote)
    } catch (error) {
      console.error('Error updating quote:', error)
      return res.status(500).json({ error: 'Error al actualizar cotización' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

