const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  const filePath = process.argv[2]

  if (!filePath) {
    console.log('\n📋 Importador de Productos desde Excel/CSV\n')
    console.log('Uso: node scripts/import-products.js <ruta-del-archivo>')
    console.log('\nEjemplo:')
    console.log('  node scripts/import-products.js productos.xlsx')
    console.log('  node scripts/import-products.js productos.csv')
    console.log('\n📝 Formato del archivo Excel/CSV:')
    console.log('  Columnas requeridas:')
    console.log('    - nombre (requerido)')
    console.log('    - precio (requerido)')
    console.log('  Columnas opcionales:')
    console.log('    - descripcion')
    console.log('    - imagen (URL)')
    console.log('    - stock (número)')
    console.log('\nEjemplo de datos:')
    console.log('  nombre,precio,descripcion,imagen,stock')
    console.log('  Martillo,25.99,Martillo profesional,https://...,50')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: El archivo "${filePath}" no existe`)
    process.exit(1)
  }

  try {
    console.log(`\n📂 Leyendo archivo: ${filePath}\n`)

    let data = []
    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.csv') {
      // Leer CSV
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const lines = fileContent.split('\n').filter((line) => line.trim())
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',')
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || ''
        })
        if (row.nombre && row.precio) {
          data.push(row)
        }
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Leer Excel
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      data = jsonData.map((row) => {
        const normalized = {}
        Object.keys(row).forEach((key) => {
          const normalizedKey = key.trim().toLowerCase()
          normalized[normalizedKey] = row[key]
        })
        return normalized
      })
    } else {
      console.error('❌ Error: Formato de archivo no soportado. Use .csv, .xlsx o .xls')
      process.exit(1)
    }

    if (data.length === 0) {
      console.error('❌ Error: No se encontraron productos en el archivo')
      process.exit(1)
    }

    console.log(`✅ Se encontraron ${data.length} productos\n`)
    console.log('📦 Importando productos...\n')

    let success = 0
    let errors = 0

    for (const product of data) {
      try {
        // Validar datos requeridos
        if (!product.nombre || !product.precio) {
          console.log(`⚠️  Omitiendo: Faltan datos requeridos - ${product.nombre || 'Sin nombre'}`)
          errors++
          continue
        }

        const price = parseFloat(product.precio)
        if (isNaN(price) || price <= 0) {
          console.log(`⚠️  Omitiendo: Precio inválido - ${product.nombre}`)
          errors++
          continue
        }

        // Verificar si el producto ya existe (por nombre)
        const existing = await prisma.product.findFirst({
          where: { name: product.nombre },
        })

        if (existing) {
          console.log(`⚠️  Ya existe: ${product.nombre} - Omitiendo`)
          errors++
          continue
        }

        // Crear producto
        await prisma.product.create({
          data: {
            name: product.nombre,
            description: product.descripcion || null,
            price: price,
            image: product.imagen || null,
            stock: product.stock ? parseInt(product.stock) || 0 : 0,
            category: product.categoría || product.category || product.categoria || null,
          },
        })

        console.log(`✅ Importado: ${product.nombre} - $${price.toFixed(2)}`)
        success++
      } catch (error) {
        console.error(`❌ Error al importar "${product.nombre}":`, error.message)
        errors++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`\n📊 Resumen:`)
    console.log(`   ✅ Importados: ${success}`)
    console.log(`   ❌ Errores: ${errors}`)
    console.log(`   📦 Total procesados: ${data.length}\n`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

