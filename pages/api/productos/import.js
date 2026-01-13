import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'
import XLSX from 'xlsx'
import formidable from 'formidable'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Verificar permisos (solo admin, superadmin o cotizador)
    const allowedRoles = ['admin', 'superadmin', 'cotizador', 'vendedor']
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    // Obtener el archivo del FormData
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })

    const [fields, files] = await form.parse(req)
    const file = files.file?.[0]

    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' })
    }

    // Leer el archivo Excel
    const workbook = XLSX.readFile(file.filepath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' })
    }

    let success = 0
    let errors = 0
    const errorMessages = []

    // Procesar cada fila
    for (const row of jsonData) {
      try {
        // Normalizar las claves (pueden venir con diferentes nombres)
        const normalized = {}
        Object.keys(row).forEach((key) => {
          const normalizedKey = key.trim().toLowerCase()
          normalized[normalizedKey] = row[key]
        })

        // Mapear nombres de columnas (soportar variaciones)
        const name = normalized.nombre || normalized.name || normalized['nombre del producto']
        const price = normalized.precio || normalized.price || normalized.precio_unitario
        const description = normalized.descripción || normalized.description || normalized.descripcion || null
        const stock = normalized.stock || normalized.cantidad || normalized.inventario || 0
        const category = normalized.categoría || normalized.category || normalized.categoria || null
        const image = normalized.imagen || normalized.image || normalized['imagen (url)'] || null

        // Validar datos requeridos
        if (!name || !price) {
          errors++
          errorMessages.push(`Fila ${jsonData.indexOf(row) + 2}: Faltan datos requeridos (nombre o precio)`)
          continue
        }

        const priceNum = parseFloat(price)
        if (isNaN(priceNum) || priceNum <= 0) {
          errors++
          errorMessages.push(`Fila ${jsonData.indexOf(row) + 2}: Precio inválido (${price})`)
          continue
        }

        const stockNum = parseInt(stock) || 0

        // Verificar si el producto ya existe (por nombre)
        const existing = await prisma.product.findFirst({
          where: { name: name.trim() },
        })

        if (existing) {
          // Actualizar producto existente
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              description: description?.trim() || existing.description,
              price: priceNum,
              stock: stockNum,
              image: image?.trim() || existing.image,
            },
          })
          success++
        } else {
          // Crear nuevo producto
          await prisma.product.create({
            data: {
              name: name.trim(),
              description: description?.trim() || null,
              price: priceNum,
              stock: stockNum,
              image: image?.trim() || null,
            },
          })
          success++
        }
      } catch (error) {
        errors++
        errorMessages.push(`Fila ${jsonData.indexOf(row) + 2}: ${error.message}`)
        console.error('Error processing row:', error)
      }
    }

    return res.status(200).json({
      success,
      errors,
      total: jsonData.length,
      errorMessages: errorMessages.slice(0, 10), // Limitar a 10 mensajes de error
    })
  } catch (error) {
    console.error('Error importing products:', error)
    return res.status(500).json({ error: 'Error al importar productos: ' + error.message })
  }
}
