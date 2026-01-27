const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Eliminando todas las cotizaciones del 22/01/2026 y anteriores...\n')

  try {
    // Fecha límite: 22/01/2026 23:59:59
    const fechaLimite = new Date('2026-01-22T23:59:59.999')
    
    console.log(`📅 Fecha límite: ${fechaLimite.toLocaleDateString('es-PE')} ${fechaLimite.toLocaleTimeString('es-PE')}\n`)

    // Obtener todas las cotizaciones hasta la fecha límite (inclusive)
    const quotesToDelete = await prisma.quote.findMany({
      where: {
        createdAt: {
          lte: fechaLimite
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        quoteNumber: true,
        name: true,
        createdAt: true
      }
    })

    console.log(`📊 Cotizaciones encontradas para eliminar: ${quotesToDelete.length}\n`)

    if (quotesToDelete.length === 0) {
      console.log('✅ No hay cotizaciones para eliminar.')
      await prisma.$disconnect()
      return
    }

    // Mostrar algunas cotizaciones que se eliminarán
    console.log('📋 Primeras cotizaciones a eliminar:\n')
    quotesToDelete.slice(0, 10).forEach((quote, index) => {
      const quoteNum = quote.quoteNumber ? `#${String(quote.quoteNumber).padStart(7, '0')}` : 'Sin número'
      const fecha = new Date(quote.createdAt).toLocaleDateString('es-PE')
      console.log(`${index + 1}. ${quoteNum} - ${quote.name} (${fecha})`)
    })
    if (quotesToDelete.length > 10) {
      console.log(`... y ${quotesToDelete.length - 10} más\n`)
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
        if (deleted <= 10 || deleted % 20 === 0) {
          console.log(`✅ Eliminada ${deleted}/${quotesToDelete.length}: ${quoteNum} - ${quote.name}`)
        }
      } catch (error) {
        errors++
        console.error(`❌ Error eliminando cotización ${quote.id}:`, error.message)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`\n📊 RESUMEN FINAL:`)
    console.log(`   ✅ Eliminadas exitosamente: ${deleted}`)
    console.log(`   ❌ Errores: ${errors}`)
    console.log(`   📦 Total procesadas: ${quotesToDelete.length}`)
    
    // Verificar cuántas quedan
    const remaining = await prisma.quote.count()
    console.log(`   📋 Cotizaciones restantes: ${remaining}\n`)
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
