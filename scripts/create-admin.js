const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'admin@ferreteria.com'
  const password = process.argv[3] || 'admin123'
  const name = process.argv[4] || 'Administrador'

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'superadmin',
        permissions: JSON.stringify(['view', 'create', 'edit', 'delete']),
      },
    })

    console.log('✅ Usuario administrador creado exitosamente:')
    console.log(`   Email: ${user.email}`)
    console.log(`   Nombre: ${user.name}`)
    console.log(`   Rol: ${user.role}`)
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  El usuario ya existe')
    } else {
      console.error('❌ Error:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()

