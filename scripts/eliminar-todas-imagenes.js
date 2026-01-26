// Script para eliminar todas las imágenes de productos
require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

// Verificar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no esta configurada')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  try {
    process.stdout.write('Conectando a la base de datos...\n')
    
    // Obtener todos los productos
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    })

    process.stdout.write(`Total de productos encontrados: ${allProducts.length}\n`)

    if (allProducts.length === 0) {
      process.stdout.write('No hay productos para actualizar\n')
      return
    }

    // Contar productos con imagen
    const productosConImagen = allProducts.filter(p => p.image && p.image.trim() !== '').length
    process.stdout.write(`Productos con imagen: ${productosConImagen}\n`)

    if (productosConImagen === 0) {
      process.stdout.write('No hay imagenes para eliminar\n')
      return
    }

    // Eliminar todas las imágenes
    process.stdout.write('Eliminando todas las imagenes...\n')
    const result = await prisma.product.updateMany({
      data: {
        image: null
      }
    })

    process.stdout.write(`${result.count} productos actualizados (imagenes eliminadas)\n`)
    process.stdout.write('Proceso completado exitosamente\n')
    process.stdout.write('Ahora puedes usar el boton "Auto Imagenes" para asignar nuevas imagenes con Unsplash\n')

  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
