# 📋 Instrucciones para Ejecutar la Migración

## ⚠️ Problema Actual

El error que estás viendo es porque `DATABASE_URL` no está configurada en tu entorno local, o no tiene el formato correcto.

## ✅ Solución

### Para Desarrollo Local:

1. **Verifica que tengas `.env.local` con `DATABASE_URL`:**
   ```env
   DATABASE_URL="postgresql://usuario:password@host:puerto/database?schema=public"
   ```
   
   Si usas Supabase, el formato sería:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"
   ```

2. **Ejecuta la migración para desarrollo:**
   ```bash
   npx prisma migrate dev
   ```
   
   Esto aplicará la migración a tu base de datos local.

### Para Producción (Vercel):

**Opción 1: Automático (Recomendado)**
- Cuando hagas `git push` a tu repositorio, Vercel detectará la nueva migración
- En el build, Vercel ejecutará automáticamente `prisma generate` y aplicará las migraciones

**Opción 2: Manual desde Vercel CLI**
1. Instala Vercel CLI: `npm i -g vercel`
2. Ejecuta:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

**Opción 3: Desde el Dashboard de Vercel**
1. Ve a tu proyecto en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Asegúrate de que `DATABASE_URL` esté configurada
4. Ve a **Deployments** → Haz clic en **Redeploy** en el último deployment

## 📝 Nota Importante

- `prisma migrate dev` → Para desarrollo local
- `prisma migrate deploy` → Para producción (requiere `DATABASE_URL` configurada)

La migración ya está creada en:
```
prisma/migrations/20250101000000_add_report_schedules/migration.sql
```

Solo necesitas aplicarla cuando tengas `DATABASE_URL` configurada correctamente.
