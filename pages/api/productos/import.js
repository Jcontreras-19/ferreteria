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
    
    if (!cleanName || cleanName.length < 2) {
      return null
    }
    
    // Intentar usar Unsplash API (requerido)
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!unsplashAccessKey) {
      console.log('⚠️ UNSPLASH_ACCESS_KEY no está configurada')
      return null
    }
    
    try {
      // Usar las primeras palabras del nombre como término de búsqueda
      const words = cleanName.split(' ').filter(w => w.length > 2).slice(0, 2).join(' ')
      const searchTerm = words || cleanName.substring(0, 15)
      
      const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=landscape`
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Client-ID ${unsplashAccessKey}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const imageUrl = data.results[0].urls?.regular || data.results[0].urls?.small
          if (imageUrl) {
            console.log(`✅ Imagen encontrada en Unsplash para "${productName}": ${searchTerm}`)
            return imageUrl
          }
        } else {
          console.log(`⚠️ No se encontraron imágenes en Unsplash para "${searchTerm}"`)
        }
      } else {
        const errorText = await response.text()
        console.log(`⚠️ Unsplash API error (${response.status}): ${errorText.substring(0, 100)}`)
      }
    } catch (error) {
      console.log('Error buscando imagen en Unsplash:', error.message)
    }
    
    // Si Unsplash no funcionó, retornar null (no usar imágenes aleatorias)
    return null
  } catch (error) {
    console.error('Error searching image:', error)
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

    // Verificar permisos - Solo administradores pueden importar productos
    const adminRoles = ['admin', 'superadmin']
    if (!adminRoles.includes(user.role?.toLowerCase())) {
      return res.status(403).json({ error: 'Solo administradores pueden importar productos' })
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

        // Buscar imagen automáticamente si no se proporcionó (solo Unsplash)
        let finalImage = image?.trim() || null
        if (!finalImage || finalImage === '') {
          try {
            finalImage = await searchProductImage(name.trim())
            // Si la búsqueda falla, dejar null (no usar imágenes aleatorias)
          } catch (error) {
            console.log(`No se pudo buscar imagen para "${name.trim()}":`, error.message)
            finalImage = null
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
              category: category?.trim() || existing.category,
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
              category: category?.trim() || null,
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
