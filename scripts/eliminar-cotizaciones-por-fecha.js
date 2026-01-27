const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando cotizaciones por fecha...\n')

  try {
    // Obtener la fecha límite (por defecto: ayer)
    const fechaLimite = process.argv[2] 
      ? new Date(process.argv[2]) 
      : new Date()
    
    // Si no se especifica fecha, usar ayer
    if (!process.argv[2]) {
      fechaLimite.setDate(fechaLimite.getDate() - 1)
      fechaLimite.setHours(23, 59, 59, 999)
    } else {
      fechaLimite.setHours(23, 59, 59, 999)
    }

    console.log(`📅 Fecha límite: ${fechaLimite.toLocaleDateString('es-PE')} ${fechaLimite.toLocaleTimeString('es-PE')}\n`)

    // Obtener todas las cotizaciones hasta la fecha límite (inclusive)
    const quotesToDelete = await prisma.quote.findMany({
      where: {
        createdAt: {
          lte: fechaLimite
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 Cotizaciones encontradas antes de la fecha límite: ${quotesToDelete.length}\n`)

    if (quotesToDelete.length === 0) {
      console.log('✅ No hay cotizaciones para eliminar.')
      return
    }

    // Mostrar resumen
    console.log('📋 Resumen de cotizaciones a eliminar:\n')
    quotesToDelete.slice(0, 20).forEach((quote, index) => {
      const quoteNum = quote.quoteNumber ? `#${String(quote.quoteNumber).padStart(7, '0')}` : 'Sin número'
      const fecha = new Date(quote.createdAt).toLocaleDateString('es-PE')
      console.log(`${index + 1}. ${quoteNum} - ${quote.name} (${fecha})`)
    })
    if (quotesToDelete.length > 20) {
      console.log(`... y ${quotesToDelete.length - 20} más\n`)
    }

    // Verificar si se debe ejecutar la eliminación
    const shouldDelete = process.argv.includes('--delete') || process.argv.includes('-d')
    
    if (!shouldDelete) {
      console.log('\n⚠️  ADVERTENCIA: Esta acción eliminará permanentemente las cotizaciones listadas arriba.')
      console.log('💡 Para ejecutar la eliminación, ejecuta el script con el flag --delete:')
      console.log(`   npm run clean-quotes-date -- "${fechaLimite.toISOString().split('T')[0]}" --delete\n`)
      return
    }

    // ELIMINAR COTIZACIONES
    console.log('\n🗑️  Eliminando cotizaciones...\n')
    
    let deleted = 0
    let errors = 0

    for (const quote of quotesToDelete) {
      try {
        await prisma.quote.delete({
          where: { id: quote.id }
        })
        deleted++
        const quoteNum = quote.quoteNumber ? `#${String(quote.quoteNumber).padStart(7, '0')}` : 'Sin número'
        if (deleted % 10 === 0 || deleted <= 5) {
          console.log(`✅ Eliminada ${deleted}/${quotesToDelete.length}: ${quoteNum} - ${quote.name}`)
        }
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
