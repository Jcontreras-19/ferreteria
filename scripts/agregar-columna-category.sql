-- Agregar columna category a la tabla Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category" TEXT;
