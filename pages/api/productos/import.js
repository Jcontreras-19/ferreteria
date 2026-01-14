import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'
import XLSX from 'xlsx'
import formidable from 'formidable'

// Función para buscar imagen de producto automáticamente
async function searchProductImage(productName) {
  try {
    // Limpiar el nombre del producto para la búsqueda
    const cleanName = productName
      .replace(/[#\d"]/g, '') // Remover números y símbolos
      .trim()
      .split(' ')
      .slice(0, 3) // Tomar las primeras 3 palabras
      .join(' ')
    
    const searchTerm = encodeURIComponent(cleanName + ' herramienta producto')
    
    // Usar Unsplash Source API (gratis, sin API key necesario)
    // Esta API devuelve imágenes aleatorias relacionadas con el término de búsqueda
    const unsplashUrl = `https://source.unsplash.com/400x400/?${searchTerm}`
    
    // Hacer una petición para obtener la URL real de la imagen
    const response = await fetch(unsplashUrl, { 
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })
    
    if (response.ok && response.url && response.url.includes('unsplash.com')) {
      // La URL de Unsplash Source redirige a la imagen real
      return response.url
    }
    
    // Si Unsplash no funciona, intentar con una búsqueda alternativa
    // Usar un servicio de placeholder que simula búsqueda de productos
    const alternativeUrl = `https://via.placeholder.com/400x400/22c55e/ffffff?text=${encodeURIComponent(cleanName)}`
    
    return alternativeUrl
  } catch (error) {
    console.error('Error searching image:', error)
    // Retornar null si falla, el producto se creará sin imagen
    return null
  }
}

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
    
    // Buscar la fila donde están los encabezados (buscar "Nombre*" o "Nombre")
    let headerRow = 0
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    for (let row = 0; row <= range.e.r; row++) {
      const cellA = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
      const cellValue = cellA ? String(cellA.v || '').trim().toLowerCase() : ''
      
      // Buscar fila que contenga "nombre" (puede ser "Nombre*" o "Nombre")
      if (cellValue.includes('nombre')) {
        headerRow = row
        break
      }
    }
    
    // Leer datos desde la fila de encabezados encontrada
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRow, // Empezar desde la fila de encabezados
      defval: null, // Valores por defecto
    })

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío o no se encontraron productos' })
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

        // Mapear nombres de columnas (soportar variaciones y asteriscos)
        // Normalizar también nombres con asteriscos como "Nombre*" -> "nombre"
        const name = normalized.nombre || normalized.name || normalized['nombre del producto'] || 
                     normalized['nombre*'] || normalized['name*']
        const price = normalized.precio || normalized.price || normalized.precio_unitario || 
                      normalized['precio*'] || normalized['price*']
        const description = normalized.descripción || normalized.description || normalized.descripcion || null
        const stock = normalized.stock || normalized.cantidad || normalized.inventario || 0
        const category = normalized.categoría || normalized.category || normalized.categoria || null
        const image = normalized.imagen || normalized.image || normalized['imagen (url)'] || 
                      normalized['imagen (url)'] || normalized['imagen(url)'] || null

        // Validar datos requeridos
        if (!name || name === '' || name === null || name === undefined) {
          errors++
          errorMessages.push(`Fila ${jsonData.indexOf(row) + 2 + headerRow}: Falta el nombre del producto`)
          continue
        }
        
        if (!price || price === '' || price === null || price === undefined) {
          errors++
          errorMessages.push(`Fila ${jsonData.indexOf(row) + 2 + headerRow}: Falta el precio del producto "${name}"`)
          continue
        }

        const priceNum = parseFloat(String(price).replace(',', '.')) // Soporta tanto coma como punto decimal
        if (isNaN(priceNum) || priceNum <= 0) {
          errors++
          errorMessages.push(`Fila ${jsonData.indexOf(row) + 2 + headerRow}: Precio inválido para "${name}" (${price})`)
          continue
        }

        const stockNum = parseInt(stock) || 0

        // Buscar imagen automáticamente si no se proporcionó
        let finalImage = image?.trim() || null
        if (!finalImage || finalImage === '') {
          try {
            finalImage = await searchProductImage(name.trim())
          } catch (error) {
            console.log(`No se pudo buscar imagen para "${name.trim()}":`, error.message)
            // Continuar sin imagen si falla la búsqueda
          }
        }

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
              image: finalImage || existing.image,
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
              image: finalImage,
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
