// Script para actualizar todas las imágenes de productos ahora mismo
// Cargar variables de entorno (igual que otros scripts)
require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

// Verificar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurada')
  console.error('   Verifica que exista un archivo .env o .env.local con DATABASE_URL')
  process.exit(1)
}

const prisma = new PrismaClient()

// Mapeo de palabras clave (mismo que en actualizar-imagenes.js)
const keywordMapping = {
  'martillo': 'hammer tool',
  'destornillador': 'screwdriver tool',
  'taladro': 'drill tool',
  'llave': 'wrench tool',
  'alicate': 'pliers tool',
  'sierra': 'saw tool',
  'nivel': 'level tool',
  'cinta métrica': 'measuring tape',
  'metro': 'measuring tape',
  'tornillo': 'screw hardware',
  'clavo': 'nail hardware',
  'tuerca': 'nut hardware',
  'abrazadera': 'clamp hardware',
  'pintura': 'paint bucket',
  'brocha': 'paint brush',
  'cable': 'electrical wire',
  'interruptor': 'light switch',
  'tubería': 'pipe plumbing',
  'grifo': 'faucet',
  'casco': 'hard hat',
  'guante': 'work gloves',
  'pegamento': 'glue',
  'silicona': 'silicone',
}

async function searchProductImage(productName) {
  try {
    const cleanName = productName.toLowerCase().trim()
    if (!cleanName || cleanName.length < 2) return null
    
    let searchTerm = null
    for (const [keyword, term] of Object.entries(keywordMapping)) {
      if (cleanName.includes(keyword)) {
        searchTerm = term
        break
      }
    }
    
    if (!searchTerm) {
      const words = cleanName.replace(/[#\d"]/g, '').split(' ').filter(w => w.length > 2).slice(0, 2).join(' ')
      searchTerm = words || cleanName.substring(0, 15)
    }
    
    return `https://source.unsplash.com/400x400/?${encodeURIComponent(searchTerm)}`
  } catch (error) {
    const cleanName = productName.trim().substring(0, 20).replace(/[^a-zA-Z0-9\s]/g, '')
    return `https://via.placeholder.com/400x400/22c55e/ffffff?text=${encodeURIComponent(cleanName || 'Producto')}`
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando actualización de imágenes...\n')
    console.log('📝 Conectando a la base de datos...\n')
    
    // Obtener todos los productos sin imagen
    const productsWithoutImage = await prisma.product.findMany({
      where: {
        OR: [
          { image: null },
          { image: '' }
        ]
      }
    })

    if (productsWithoutImage.length === 0) {
      console.log('✅ Todos los productos ya tienen imagen')
      return
    }

    console.log(`📦 Encontrados ${productsWithoutImage.length} productos sin imagen\n`)
    console.log('🔄 Actualizando imágenes...\n')

    let updated = 0
    let errors = 0

    for (const product of productsWithoutImage) {
      try {
        const imageUrl = await searchProductImage(product.name)
        
        const finalImage = imageUrl || (() => {
          const cleanName = product.name.trim().substring(0, 20).replace(/[^a-zA-Z0-9\s]/g, '')
          return `https://via.placeholder.com/400x400/22c55e/ffffff?text=${encodeURIComponent(cleanName || 'Producto')}`
        })()

        await prisma.product.update({
          where: { id: product.id },
          data: { image: finalImage }
        })

        updated++
        if (updated % 10 === 0) {
          console.log(`   ✅ Procesados: ${updated}/${productsWithoutImage.length}`)
        }
      } catch (error) {
        console.error(`   ❌ Error en "${product.name}":`, error.message)
        errors++
      }
    }

    console.log('\n✨ RESUMEN:')
    console.log(`   ✅ Actualizados: ${updated}`)
    console.log(`   ❌ Errores: ${errors}`)
    console.log(`   📦 Total: ${productsWithoutImage.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
