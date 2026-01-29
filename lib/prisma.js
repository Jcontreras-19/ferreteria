import { PrismaClient } from '@prisma/client'

const globalForPrisma = global

// Configurar pool de conexiones para evitar límites de Supabase
const prismaOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
}

// Configurar URL de base de datos con parámetros de conexión optimizados
let databaseUrl = process.env.DATABASE_URL

if (databaseUrl) {
  try {
    // Parsear la URL
    const url = new URL(databaseUrl)
    
    // Asegurar que se use el pooler de Supabase (puerto 6543) si es Supabase
    if (url.hostname.includes('supabase') && url.port !== '6543' && !url.hostname.includes('pooler')) {
      // Convertir a pooler: cambiar el hostname y puerto
      const projectMatch = url.hostname.match(/postgres\.([^.]+)\.supabase\.co/)
      if (projectMatch) {
        const project = projectMatch[1]
        // Construir URL del pooler (puerto 6543)
        url.hostname = `aws-0-us-east-1.pooler.supabase.com`
        url.port = '6543'
        url.username = `postgres.${project}`
      }
    }
    
    // Agregar parámetros de conexión optimizados para evitar límites
    url.searchParams.set('connection_limit', '1')
    url.searchParams.set('pool_timeout', '20')
    url.searchParams.set('connect_timeout', '10')
    
    // Si es Supabase, asegurar que use pgbouncer
    if (url.hostname.includes('supabase')) {
      url.searchParams.set('pgbouncer', 'true')
    }
    
    databaseUrl = url.toString()
    
    prismaOptions.datasources = {
      db: {
        url: databaseUrl
      }
    }
  } catch (error) {
    console.error('Error configurando DATABASE_URL:', error)
    // Si hay error, usar la URL original
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Manejar desconexión al cerrar la aplicación
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
  
  process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}
