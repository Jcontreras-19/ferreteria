const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando cotizaciones con productos que ya no existen...\n')

  try {
    // Obtener todas las cotizaciones
    const allQuotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 Total de cotizaciones encontradas: ${allQuotes.length}\n`)

    // Obtener todos los IDs de productos existentes
    const existingProducts = await prisma.product.findMany({
      select: { id: true }
    })
    const existingProductIds = new Set(existingProducts.map(p => p.id))

    console.log(`✅ Productos existentes en la base de datos: ${existingProductIds.size}\n`)

    const quotesToDelete = []
    let processed = 0

    // Revisar cada cotización
    for (const quote of allQuotes) {
      processed++
      try {
        // Parsear productos (compatible con formato antiguo y nuevo)
        const productsData = typeof quote.products === 'string' 
          ? JSON.parse(quote.products) 
          : quote.products
        
        // Obtener el array de productos (puede estar en items o ser el array directamente)
        const products = productsData.items || productsData
        
        // Asegurarse de que es un array
        if (!Array.isArray(products) || products.length === 0) {
          // Si no hay productos válidos, también la eliminamos
          quotesToDelete.push({
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            name: quote.name,
            reason: 'Sin productos válidos'
          })
          continue
        }

        // Extraer IDs de productos
        const productIds = products
          .map(p => p.id)
          .filter(id => id) // Filtrar IDs nulos o undefined

        // Si no hay IDs válidos, verificar si hay productos no encontrados
        if (productIds.length === 0) {
          const notFoundProducts = productsData.notFoundProducts || []
          if (Array.isArray(notFoundProducts) && notFoundProducts.length > 0) {
            // Tiene productos no encontrados pero no productos válidos
            quotesToDelete.push({
              id: quote.id,
              quoteNumber: quote.quoteNumber,
              name: quote.name,
              reason: 'Solo productos no encontrados'
            })
          }
          continue
        }

        // Verificar si algún producto no existe
        const missingProducts = productIds.filter(id => !existingProductIds.has(id))
        
        if (missingProducts.length > 0) {
          quotesToDelete.push({
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            name: quote.name,
            reason: `Productos inexistentes: ${missingProducts.length} de ${productIds.length}`,
            missingProductIds: missingProducts
          })
        }

        // Mostrar progreso cada 50 cotizaciones
        if (processed % 50 === 0) {
          console.log(`⏳ Procesadas ${processed}/${allQuotes.length} cotizaciones...`)
        }
      } catch (error) {
        console.error(`❌ Error procesando cotización ${quote.id}:`, error.message)
        // Si hay error al parsear, también la eliminamos
        quotesToDelete.push({
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          name: quote.name,
          reason: `Error al parsear: ${error.message}`
        })
      }
    }

    console.log(`\n✅ Procesamiento completado\n`)
    console.log(`📋 Cotizaciones a eliminar: ${quotesToDelete.length}\n`)

    if (quotesToDelete.length === 0) {
      console.log('✅ No hay cotizaciones para eliminar. Todas las cotizaciones tienen productos válidos.')
      return
    }

    // Mostrar resumen de cotizaciones a eliminar
    console.log('📋 Resumen de cotizaciones a eliminar:\n')
    quotesToDelete.forEach((quote, index) => {
      const quoteNum = quote.quoteNumber ? `#${String(quote.quoteNumber).padStart(7, '0')}` : 'Sin número'
      console.log(`${index + 1}. ${quoteNum} - ${quote.name}`)
      console.log(`   Razón: ${quote.reason}`)
      if (quote.missingProductIds && quote.missingProductIds.length > 0) {
        console.log(`   IDs faltantes: ${quote.missingProductIds.slice(0, 5).join(', ')}${quote.missingProductIds.length > 5 ? '...' : ''}`)
      }
      console.log('')
    })

    // Verificar si se debe ejecutar la eliminación
    const shouldDelete = process.argv.includes('--delete') || process.argv.includes('-d')
    
    if (!shouldDelete) {
      console.log('⚠️  ADVERTENCIA: Esta acción eliminará permanentemente las cotizaciones listadas arriba.')
      console.log('💡 Para ejecutar la eliminación, ejecuta el script con el flag --delete:')
      console.log('   npm run clean-quotes -- --delete\n')
      return
    }

    // ELIMINAR COTIZACIONES
    console.log('🗑️  Eliminando cotizaciones...\n')
    
    let deleted = 0
    let errors = 0

    for (const quote of quotesToDelete) {
      try {
        await prisma.quote.delete({
          where: { id: quote.id }
        })
        deleted++
        const quoteNum = quote.quoteNumber ? `#${String(quote.quoteNumber).padStart(7, '0')}` : 'Sin número'
        console.log(`✅ Eliminada: ${quoteNum} - ${quote.name}`)
      } catch (error) {
        errors++
        console.error(`❌ Error eliminando cotización ${quote.id}:`, error.message)
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`\n📊 Resumen:`)
    console.log(`   ✅ Eliminadas: ${deleted}`)
    console.log(`   ❌ Errores: ${errors}`)
    console.log(`   📦 Total procesadas: ${quotesToDelete.length}\n`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
