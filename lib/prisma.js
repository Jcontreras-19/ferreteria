import { PrismaClient } from '@prisma/client'

const globalForPrisma = global

// Configurar pool de conexiones para evitar límites de Supabase
const prismaOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
}

// Si la DATABASE_URL usa el pooler de Supabase, agregar parámetros de conexión
if (process.env.DATABASE_URL?.includes('pooler.supabase.com') || process.env.DATABASE_URL?.includes('Session mode')) {
  // Usar configuración optimizada para pooler
  prismaOptions.datasources = {
    db: {
      url: process.env.DATABASE_URL?.replace('?pgbouncer=true', '')?.replace('&pgbouncer=true', '') + '?connection_limit=1&pool_timeout=20'
    }
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

