// Script para crear un usuario cotizador/vendedor
// Uso: node scripts/create-cotizador.js "nombre" "email" "password"

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createCotizador() {
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    console.log('📖 Uso: node scripts/create-cotizador.js "Nombre Completo" "email@ejemplo.com" "password123"')
    console.log('\nEjemplo:')
    console.log('   node scripts/create-cotizador.js "Juan Pérez" "juan@ferreteria.com" "password123"')
    process.exit(1)
  }

  const [name, email, password] = args

  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log(`⚠️  El usuario con email ${email} ya existe`)
      console.log('   ¿Deseas actualizar su rol a cotizador? (S/N)')
      // Por ahora, solo actualizamos el rol
      await prisma.user.update({
        where: { email },
        data: { role: 'cotizador' },
      })
      console.log(`✅ Usuario actualizado a rol: cotizador`)
      await prisma.$disconnect()
      return
    }

    // Hashear password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'cotizador',
        permissions: '["view", "approve", "reject"]',
      },
    })

    console.log('\n✅ Usuario cotizador creado exitosamente!')
    console.log(`   Nombre: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Rol: ${user.role}`)
    console.log(`   ID: ${user.id}\n`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createCotizador()
