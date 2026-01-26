const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const count = await prisma.product.count()
    console.log('═══════════════════════════════════')
    console.log(`TOTAL DE PRODUCTOS: ${count}`)
    console.log('═══════════════════════════════════')
  } catch (error) {
    console.error('Error al contar productos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
