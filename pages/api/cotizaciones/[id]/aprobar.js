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
      return res.status(403).json({ error: 'No tienes permiso para aprobar cotizaciones' })
    }

    const { id } = req.query
    const { estimatedDelivery, notes, clientEmail } = req.body

    // Validar que se proporcione el correo del cliente
    if (!clientEmail || !clientEmail.trim()) {
      return res.status(400).json({ error: 'El correo del cliente es requerido' })
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clientEmail.trim())) {
      return res.status(400).json({ error: 'El correo del cliente no es válido' })
    }

    // Obtener la cotización antes de actualizarla para tener todos los datos
    const quoteBeforeUpdate = await prisma.quote.findUnique({
      where: { id },
    })

    if (!quoteBeforeUpdate) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }

    // Actualizar la cotización
    // NOTA: El webhook a N8N solo se envía cuando se autoriza el despacho, no al aprobar
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: user.id,
        estimatedDelivery: estimatedDelivery ? parseInt(estimatedDelivery) : null,
        notes: notes || null,
        email: clientEmail.trim(), // Actualizar el correo con el del cliente
        updatedAt: new Date(),
      },
    })

    console.log(`✅ Cotización ${updatedQuote.quoteNumber} aprobada. El webhook a N8N se enviará cuando se autorice el despacho.`)

    return res.status(200).json(updatedQuote)
  } catch (error) {
    console.error('Error approving quote:', error)
    return res.status(500).json({ error: 'Error al aprobar cotización' })
  }
}
