import { prisma } from '../../../lib/prisma'
import { getCurrentUser } from '../../../lib/auth'
import ExcelJS from 'exceljs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Crear nuevo workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Productos')

    // Colores corporativos GRC (verde)
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' } // green-600
    }

    const headerFont = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' } // Blanco
    }

    // Bordes negros
    const blackBorder = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }

    // Agregar logo/icono de la empresa en la parte superior
    worksheet.insertRow(1, [''])
    worksheet.mergeCells('A1:G1')
    const logoCell = worksheet.getCell('A1')
    logoCell.value = 'CORPORACIÓN GRC'
    logoCell.font = {
      name: 'Arial',
      size: 18,
      bold: true,
      color: { argb: 'FF16A34A' } // Verde corporativo
    }
    logoCell.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    }
    logoCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0FDF4' } // Verde muy claro de fondo
    }
    // Agregar borde al título
    logoCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
    worksheet.getRow(1).height = 35

    // Agregar información de la empresa
    worksheet.insertRow(2, [''])
    worksheet.mergeCells('A2:G2')
    const companyCell = worksheet.getCell('A2')
    companyCell.value = 'SERVICIOS DE APOYO A LAS EMPRESAS - ISO 9001:2015'
    companyCell.font = {
      name: 'Arial',
      size: 10,
      bold: true, // Negrita
      color: { argb: 'FF6B7280' } // Gris
    }
    companyCell.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    }
    worksheet.getRow(2).height = 20

    // Fecha de exportación
    worksheet.insertRow(3, [''])
    worksheet.mergeCells('A3:G3')
    const dateCell = worksheet.getCell('A3')
    dateCell.value = `Fecha de exportación: ${new Date().toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`
    dateCell.font = {
      name: 'Arial',
      size: 9,
      bold: true, // Negrita
      color: { argb: 'FF6B7280' }
    }
    dateCell.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    }
    worksheet.getRow(3).height = 18

    // Fila vacía
    worksheet.insertRow(4, [''])
    worksheet.getRow(4).height = 5

    // Encabezados de la tabla (sin ID)
    const headers = ['Nombre', 'Descripción', 'Precio Unitario', 'Stock', 'Categoría', 'Imagen', 'Fecha de Creación']
    const headerRow = worksheet.addRow(headers)
    
    // Formatear encabezados
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = headerFill
      cell.font = headerFont
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
        wrapText: true
      }
      cell.border = blackBorder
    })
    headerRow.height = 25

    // Función para formatear fecha
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    // Agregar datos
    products.forEach((product, index) => {
      const row = worksheet.addRow([
        product.name,
        product.description || '',
        product.price || 0,
        product.stock || 0,
        product.category || '',
        product.image || '',
        formatDate(product.createdAt)
      ])

      // Formatear filas de datos
        row.eachCell((cell, colNumber) => {
          cell.border = blackBorder
          cell.alignment = { 
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          }
          cell.font = {
            name: 'Arial',
            size: 10
          }

          // Formato numérico para columnas específicas
          if (colNumber === 3) { // Precio Unitario
            cell.numFmt = '#,##0.00'
          } else if (colNumber === 4) { // Stock
            cell.numFmt = '0'
          }

          // Color alternado de filas
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' } // Blanco
            }
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' } // Gris muy claro
            }
          }
        })
        // Altura fija de 35 para todas las filas
        row.height = 35
    })

    // Ajustar ancho de columnas
    worksheet.getColumn(1).width = 30 // Nombre
    worksheet.getColumn(2).width = 50 // Descripción
    worksheet.getColumn(3).width = 15 // Precio Unitario
    worksheet.getColumn(4).width = 12 // Stock
    worksheet.getColumn(5).width = 25 // Categoría
    worksheet.getColumn(6).width = 50 // Imagen
    worksheet.getColumn(7).width = 25 // Fecha de Creación

    // Asegurar que todas las celdas de la tabla tengan bordes negros
    const headerRowNumber = 5 // Fila de encabezados (después de las 4 filas iniciales)
    const lastRow = worksheet.rowCount
    const lastCol = headers.length
    
    // Aplicar bordes negros a todas las celdas de la tabla (encabezados y datos)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= headerRowNumber && rowNumber <= lastRow) {
        row.eachCell((cell, colNumber) => {
          if (colNumber <= lastCol) {
            cell.border = blackBorder
          }
        })
      }
    })

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer()

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=productos-${new Date().toISOString().split('T')[0]}.xlsx`
    )

    return res.send(buffer)
  } catch (error) {
    console.error('Error exporting products:', error)
    return res.status(500).json({ error: 'Error al exportar productos' })
  }
}

