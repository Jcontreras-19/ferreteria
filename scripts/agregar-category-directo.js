require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function agregarColumnaCategory() {
  try {
    console.log('\n🔧 Agregando columna category a la base de datos...\n')
    
    // Verificar DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('❌ ERROR: DATABASE_URL no está configurada')
      console.error('   Verifica tu archivo .env o .env.local')
      process.exit(1)
    }
    
    console.log('📡 Conectando a la base de datos...')
    console.log(`   URL: ${process.env.DATABASE_URL.substring(0, 30)}...\n`)
    
    // Ejecutar SQL directo para agregar la columna
    console.log('🔨 Ejecutando ALTER TABLE...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Product" 
      ADD COLUMN IF NOT EXISTS "category" TEXT;
    `)
    
    console.log('✅ Columna category agregada exitosamente!\n')
    
    // Regenerar cliente de Prisma
    console.log('🔄 Regenerando cliente de Prisma...\n')
    const { execSync } = require('child_process')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    console.log('\n✅ Cliente de Prisma regenerado!')
    console.log('✨ Ahora puedes ejecutar: npm run categorizar\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.code === 'P1012') {
      console.error('\n⚠️  El problema es que DATABASE_URL no está configurada correctamente.')
      console.error('   Verifica que tu archivo .env.local tenga:')
      console.error('   DATABASE_URL=postgresql://...')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

agregarColumnaCategory()
