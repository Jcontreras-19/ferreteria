import { prisma } from '../../../../lib/prisma'
import { getCurrentUser } from '../../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
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
      return res.status(403).json({ error: 'No tienes permiso para rechazar cotizaciones' })
    }

    const { id } = req.query
    const { rejectionReason } = req.body

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedBy: user.id,
        rejectionReason: rejectionReason || null,
        updatedAt: new Date(),
      },
    })

    return res.status(200).json(quote)
  } catch (error) {
    console.error('Error rejecting quote:', error)
    return res.status(500).json({ error: 'Error al rechazar cotización' })
  }
}
