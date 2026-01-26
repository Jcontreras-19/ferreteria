import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { FiEdit, FiTrash2, FiPlus, FiDownload, FiSearch, FiFilter, FiGrid, FiList, FiEye, FiPackage, FiDollarSign, FiTrendingUp, FiAlertCircle, FiUpload, FiX, FiCheckCircle, FiXCircle, FiInfo, FiTag, FiImage } from 'react-icons/fi'
import Image from 'next/image'
import ExcelJS from 'exceljs'

export default function AdminProductos() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    stock: '',
    category: '',
  })
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    outOfStock: 0,
    lowStock: 0,
    mediumStock: 0,
    highStock: 0,
  })
  const [updatingImages, setUpdatingImages] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchProducts()
    fetchStats()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (res.ok) {
        const userData = await res.json()
        // Verificar que el usuario tenga un rol de administrador
        const adminRoles = ['admin', 'superadmin', 'editor', 'viewer']
        if (!adminRoles.includes(userData.role)) {
          window.location.href = '/'
          return
        }
        setUser(userData)
      } else {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Auth error:', error)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async (page = currentPage) => {
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''
      const url = `/api/productos?page=${page}&limit=10${searchParam}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        // Si la respuesta tiene paginación, usar esa estructura
        if (data.products && data.pagination) {
          setProducts(data.products)
          setPagination(data.pagination)
        } else {
          // Fallback para compatibilidad con respuestas antiguas
          setProducts(Array.isArray(data) ? data : [])
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchStats = async () => {
    try {
      // Obtener todos los productos sin paginación para calcular estadísticas reales
      const res = await fetch('/api/productos?limit=10000')
      if (res.ok) {
        const data = await res.json()
        const allProducts = data.products || (Array.isArray(data) ? data : [])
        
        const calculatedStats = {
          total: allProducts.length,
          outOfStock: allProducts.filter(p => (p.stock || 0) === 0).length,
          lowStock: allProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length,
          mediumStock: allProducts.filter(p => (p.stock || 0) >= 10 && (p.stock || 0) < 50).length,
          highStock: allProducts.filter(p => (p.stock || 0) >= 50).length,
        }
        
        setStats(calculatedStats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    setCurrentPage(1) // Resetear a página 1 cuando cambia la búsqueda
    fetchProducts(1)
    // Actualizar estadísticas cuando cambia la búsqueda (si no hay búsqueda, mostrar todas)
    if (!searchQuery) {
      fetchStats()
    }
  }, [searchQuery])

  useEffect(() => {
    fetchProducts(currentPage)
  }, [currentPage])

  // Efecto para asegurar que los datos se carguen cuando se abre el modal o cambia el producto
  useEffect(() => {
    if (showModal && editingProduct) {
      const productData = {
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        price: editingProduct.price != null ? String(editingProduct.price) : '',
        image: editingProduct.image || '',
        stock: editingProduct.stock != null ? String(editingProduct.stock) : '0',
        category: editingProduct.category || '',
      }
      // Forzar actualización de formData
      setFormData(productData)
    } else if (showModal && !editingProduct) {
      // Limpiar formulario para nuevo producto
      setFormData({ name: '', description: '', price: '', image: '', stock: '' })
    }
  }, [showModal, editingProduct])

  const handleEdit = (product) => {
    // Preparar los datos del producto para el formulario
    const productData = {
      name: product.name || '',
      description: product.description || '',
      price: product.price != null ? String(product.price) : '',
      image: product.image || '',
      stock: product.stock != null ? String(product.stock) : '0',
      category: product.category || '',
    }
    
    // Establecer los datos del formulario PRIMERO
    setFormData(productData)
    // Luego establecer el producto a editar
    setEditingProduct(product)
    // Abrir el modal
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Si eliminamos el último producto de la página y no es la primera página, ir a la anterior
        if (products.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1)
        } else {
          fetchProducts(currentPage)
        }
      } else {
        alert('Error al eliminar producto')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar producto')
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB')
      return
    }

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (res.ok) {
        const data = await res.json()
        setFormData({ ...formData, image: data.url })
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('Error al subir:', errorData)
        alert(`Error al subir la imagen: ${errorData.error || errorData.details || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error uploading:', error)
      alert(`Error al subir la imagen: ${error.message || 'Error de conexión'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e, overrideData = null) => {
    e.preventDefault()
    try {
      const url = editingProduct
        ? `/api/productos/${editingProduct.id}`
        : '/api/productos'
      const method = editingProduct ? 'PUT' : 'POST'

      // Usar los datos proporcionados o formData como fallback
      const dataToSend = overrideData || formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dataToSend,
          price: parseFloat(dataToSend.price),
          stock: parseInt(dataToSend.stock) || 0,
        }),
      })

      if (res.ok) {
        const emptyData = { name: '', description: '', price: '', image: '', stock: '' }
        setFormData(emptyData)
        setEditingProduct(null)
        setShowModal(false)
        // Forzar actualización de la lista de productos manteniendo la página actual
        await fetchProducts(currentPage)
      } else {
        const data = await res.json()
        alert(data.error || 'Error al guardar producto')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar producto')
    }
  }

  const handleExportExcel = async () => {
    try {
      const res = await fetch('/api/productos/export')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `productos-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Error al exportar productos')
    }
  }

  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Formato Productos')

      const GRC_GREEN = '22C55E'
      const GRC_DARK_GREEN = '14532D'
      const WHITE = 'FFFFFF'

      const createGRCLogo = () => {
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas')
          canvas.width = 80
          canvas.height = 80
          const ctx = canvas.getContext('2d')

          const centerX = canvas.width / 2
          const centerY = canvas.height / 2
          const radius = 35

          ctx.beginPath()
          ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI)
          ctx.fillStyle = '#FFFFFF'
          ctx.fill()

          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
          ctx.fillStyle = '#' + GRC_DARK_GREEN
          ctx.fill()

          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 24px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('GRC', centerX, centerY)

          canvas.toBlob((blob) => {
            blob.arrayBuffer().then((arrayBuffer) => {
              resolve(new Uint8Array(arrayBuffer))
            })
          }, 'image/png')
        })
      }

      try {
        const logoBuffer = await createGRCLogo()
        const imageId = workbook.addImage({
          buffer: logoBuffer,
          extension: 'png',
        })
        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 80, height: 80 },
        })
        worksheet.getRow(1).height = 60
      } catch (error) {
        console.log('Error creando logo GRC:', error)
        const logoCell = worksheet.getCell('A1')
        logoCell.value = 'GRC'
        logoCell.font = { bold: true, size: 18, color: { argb: 'FF' + WHITE } }
        logoCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF' + GRC_DARK_GREEN }
        }
        logoCell.alignment = { vertical: 'middle', horizontal: 'center' }
        worksheet.mergeCells('A1:B1')
        worksheet.getRow(1).height = 60
      }

      worksheet.getRow(2).height = 20

      const headers = ['Nombre*', 'Descripción', 'Precio*', 'Stock', 'Categoría', 'Imagen (URL)']
      const headerRow = worksheet.getRow(3)

      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1)
        cell.value = header
        cell.font = { bold: true, size: 11, color: { argb: 'FF' + WHITE } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF' + GRC_GREEN }
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF' + WHITE } },
          bottom: { style: 'thin', color: { argb: 'FF' + WHITE } },
          left: { style: 'thin', color: { argb: 'FF' + WHITE } },
          right: { style: 'thin', color: { argb: 'FF' + WHITE } }
        }
      })

      headerRow.height = 30

      const exampleData = [
        ['Martillo Profesional', 'Martillo de acero con mango ergonómico', 25.99, 50, 'Herramientas', ''],
        ['Destornillador Phillips #2', 'Destornillador de punta Phillips tamaño #2', 8.50, 100, 'Herramientas', ''],
        ['Llave Inglesa Ajustable 10"', 'Llave ajustable de acero cromado', 15.99, 75, 'Herramientas', ''],
      ]

      exampleData.forEach((row, rowIndex) => {
        const dataRow = worksheet.getRow(4 + rowIndex)
        row.forEach((value, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1)
          cell.value = value
          cell.alignment = { vertical: 'middle', horizontal: colIndex === 2 ? 'right' : 'left', wrapText: true }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          }

          if (rowIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' }
            }
          }
        })
        dataRow.height = 25
      })

      worksheet.getColumn(1).width = 30
      worksheet.getColumn(2).width = 45
      worksheet.getColumn(3).width = 12
      worksheet.getColumn(4).width = 10
      worksheet.getColumn(5).width = 18
      worksheet.getColumn(6).width = 40

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'formato-productos.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showNotification('Formato descargado exitosamente', 'success')
    } catch (error) {
      console.error('Error generando Excel:', error)
      showNotification('Error al generar el formato', 'error')
    }
  }

  const handleUpdateImages = async () => {
    if (!confirm('¿Deseas asignar imágenes automáticamente a los productos que NO tienen imagen?\n\nEsto buscará imágenes en Unsplash basadas en el nombre de cada producto.\n\n⏱️ Este proceso puede tomar varios minutos dependiendo de la cantidad de productos sin imagen.\n\n¿Continuar?')) {
      return
    }

    setUpdatingImages(true)
    try {
      // Timeout más largo ya que el proceso puede tomar varios minutos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000) // 15 minutos
      
      const res = await fetch('/api/productos/actualizar-imagenes', {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      // Verificar el tipo de contenido antes de parsear JSON
      const contentType = res.headers.get('content-type')
      let data

      if (contentType && contentType.includes('application/json')) {
        try {
          const text = await res.text()
          if (!text || text.trim() === '') {
            throw new Error('Respuesta vacía del servidor')
          }
          data = JSON.parse(text)
        } catch (jsonError) {
          console.error('Error parseando JSON:', jsonError)
          console.error('Respuesta recibida:', await res.clone().text())
          throw new Error(`Error al procesar respuesta del servidor: ${jsonError.message}`)
        }
      } else {
        // Si no es JSON, intentar leer como texto para mostrar el error
        const text = await res.text()
        console.error('Respuesta no es JSON:', text)
        throw new Error(`El servidor respondió con un formato inesperado. Estado: ${res.status}`)
      }

      if (res.ok && data.success) {
        showNotification(
          `✅ ${data.message || `Imágenes actualizadas: ${data.updated} productos`}`,
          'success'
        )
        // Recargar productos para ver las nuevas imágenes
        fetchProducts(currentPage)
        fetchStats()
      } else {
        const errorMessage = data.error || data.message || 'Error al actualizar imágenes'
        const details = data.details ? `\n\nDetalles: ${data.details}` : ''
        showNotification(`❌ ${errorMessage}${details}`, 'error')
        console.error('Error del servidor:', data)
      }
    } catch (error) {
      console.error('Error updating images:', error)
      let errorMsg = 'Error de conexión'
      
      if (error.name === 'AbortError') {
        errorMsg = 'La operación tardó demasiado tiempo. El proceso puede estar ejecutándose en segundo plano.'
      } else if (error.message) {
        errorMsg = error.message
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMsg = 'Error de red. Verifica tu conexión a internet.'
      }
      
      showNotification(`❌ Error al actualizar imágenes: ${errorMsg}`, 'error')
    } finally {
      setUpdatingImages(false)
    }
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls')) {
        setImportFile(file)
      } else {
        showNotification('Por favor selecciona un archivo Excel (.xlsx o .xls)', 'error')
        e.target.value = ''
      }
    }
  }

  const handleImportProducts = async () => {
    if (!importFile) {
      showNotification('Por favor selecciona un archivo', 'error')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const res = await fetch('/api/productos/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        if (data.success > 0) {
          showNotification(`✅ ${data.success} productos importados exitosamente. ${data.errors > 0 ? `${data.errors} errores.` : ''}`, 'success')
        } else {
          showNotification(`⚠️ No se importaron productos. ${data.errors} errores encontrados.`, 'error')
        }
        
        if (data.errorMessages && data.errorMessages.length > 0) {
          console.error('Errores de importación:', data.errorMessages)
          const errorSummary = data.errorMessages.slice(0, 3).join('; ')
          if (data.errorMessages.length > 3) {
            showNotification(`Errores: ${errorSummary}... (ver consola para más detalles)`, 'error')
          } else {
            showNotification(`Errores: ${errorSummary}`, 'error')
          }
        }
        
        setShowImportModal(false)
        setImportFile(null)
        fetchProducts()
      } else {
        showNotification(data.error || 'Error al importar productos', 'error')
      }
    } catch (error) {
      console.error('Error importing products:', error)
      showNotification('Error al importar productos', 'error')
    } finally {
      setImporting(false)
    }
  }

  const showNotification = (message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Sin Stock', color: 'red', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
    if (stock < 10) return { label: 'Stock Bajo', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' }
    if (stock < 50) return { label: 'Stock Medio', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' }
    return { label: 'Stock Alto', color: 'green', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' }
  }

  // Los productos ya vienen filtrados desde la API, no necesitamos filtrar de nuevo
  const filteredProducts = products

  // Las estadísticas ahora se obtienen de fetchStats() que calcula sobre TODOS los productos

  return (
    <>
      <Head>
        <title>Productos - Panel Administrador</title>
      </Head>
      <AdminLayout user={user} onLogout={handleLogout}>
        <div className="space-y-4">
          {/* Header Compacto con Estadísticas */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">INVENTARIO DE PRODUCTOS</h1>
                <p className="text-gray-600 text-xs mt-0.5">
                  {pagination.totalProducts || products.length} producto{(pagination.totalProducts || products.length) !== 1 ? 's' : ''} en total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de cards"
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de tabla"
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>

            {/* Estadísticas Compactas - Igual que inventario */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-800 text-xs font-semibold">Total</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <FiPackage className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border-2 border-red-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-red-800 text-xs font-semibold">Sin Stock</span>
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                    <FiXCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-900">{stats.outOfStock}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-2 border-orange-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-orange-800 text-xs font-semibold">Stock Bajo</span>
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                    <FiAlertCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-orange-900">{stats.lowStock}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border-2 border-yellow-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-yellow-800 text-xs font-semibold">Stock Medio</span>
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                    <FiAlertCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{stats.mediumStock}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-800 text-xs font-semibold">Stock Alto</span>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <FiCheckCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.highStock}</p>
              </div>
            </div>
          </div>

          {/* Filtros Compactos en una sola fila */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Título de Filtros */}
                <div className="flex items-center gap-2 mr-2">
                  <FiFilter size={16} className="text-gray-600" />
                  <h2 className="text-sm font-bold text-gray-800">Filtros</h2>
                  {searchQuery && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Filtros activos
                    </span>
                  )}
                </div>

                {/* Búsqueda */}
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o descripción..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 text-sm"
                    style={{ color: '#111827' }}
                  />
                </div>

                {/* Botones de Exportar, Importar, Formato y Nuevo */}
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  <span>Formato</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiUpload size={14} />
                  <span>Importar</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handleUpdateImages}
                  disabled={updatingImages}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  title="Asignar imágenes automáticamente solo a productos que NO tienen imagen usando Unsplash"
                >
                  <FiImage size={14} />
                  <span>{updatingImages ? 'Asignando...' : 'Auto Imágenes'}</span>
                </button>
                <button
                  onClick={() => {
                    const emptyData = { name: '', description: '', price: '', image: '', stock: '', category: '' }
                    setFormData(emptyData)
                    setEditingProduct(null)
                    setShowModal(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiPlus size={14} />
                  <span>Nuevo</span>
                </button>
              </div>

              {/* Contador de resultados */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t border-gray-200">
                <span>Mostrando {filteredProducts.length} de {products.length} productos</span>
              </div>
            </div>
          </div>

          {/* Vista de Tabla o Cards */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-600 to-emerald-700">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiPackage size={14} />
                          Imagen
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Precio
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiTag size={14} />
                          Categoría
                        </div>
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <FiPackage className="mx-auto text-gray-400 mb-3" size={48} />
                          <p className="text-gray-600 text-lg">No hay productos disponibles</p>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product, index) => (
                        <tr 
                          key={product.id} 
                          className={`transition-colors ${
                            index % 2 === 0 
                              ? 'bg-white hover:bg-blue-50' 
                              : 'bg-gray-50 hover:bg-blue-50'
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="w-16 h-16 relative bg-gray-200 rounded-lg overflow-hidden">
                              {product.image && 
                               product.image.trim() !== '' && 
                               !product.image.includes('via.placeholder.com') &&
                               !product.image.includes('source.unsplash.com') ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    const fallback = e.target.nextElementSibling
                                    if (fallback) fallback.classList.remove('hidden')
                                  }}
                                  onLoad={() => {
                                    const fallback = e.target.nextElementSibling
                                    if (fallback) fallback.classList.add('hidden')
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center text-gray-400 ${product.image && 
                               product.image.trim() !== '' && 
                               !product.image.includes('via.placeholder.com') &&
                               !product.image.includes('source.unsplash.com') ? 'hidden' : ''}`}>
                                <FiPackage size={24} />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                              {product.description && (
                                <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-base font-bold text-green-600">
                              S/. {product.price?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg ${
                                (product.stock || 0) > 10
                                  ? 'bg-green-50 text-green-700 border-2 border-green-300'
                                  : (product.stock || 0) > 0
                                  ? 'bg-yellow-50 text-yellow-700 border-2 border-yellow-300'
                                  : 'bg-red-50 text-red-700 border-2 border-red-300'
                              }`}
                            >
                              {product.stock || 0}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {product.category ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <FiTag className="text-purple-600" size={12} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">{product.category}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">N/A</span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="group relative flex items-center justify-center w-9 h-9 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 hover:border-blue-400 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Editar"
                              >
                                <FiEdit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="group relative flex items-center justify-center w-9 h-9 bg-red-50 hover:bg-red-100 border-2 border-red-300 hover:border-red-400 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Eliminar"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="bg-gray-50 px-5 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Página {pagination.currentPage} de {pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (pagination.hasPrevPage) {
                            setCurrentPage(currentPage - 1)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }}
                        disabled={!pagination.hasPrevPage}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pagination.hasPrevPage
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Anterior
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Mostrar primera página, última página, página actual y páginas adyacentes
                            return (
                              page === 1 ||
                              page === pagination.totalPages ||
                              (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)
                            )
                          })
                          .map((page, index, array) => {
                            // Agregar "..." si hay un gap
                            const showEllipsis = index > 0 && array[index] - array[index - 1] > 1
                            return (
                              <div key={page} className="flex items-center gap-1">
                                {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                                <button
                                  onClick={() => {
                                    setCurrentPage(page)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    page === pagination.currentPage
                                      ? 'bg-green-600 text-white'
                                      : 'bg-white hover:bg-green-50 text-gray-700 border border-gray-300'
                                  }`}
                                >
                                  {page}
                                </button>
                              </div>
                            )
                          })}
                      </div>
                      <button
                        onClick={() => {
                          if (pagination.hasNextPage) {
                            setCurrentPage(currentPage + 1)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }}
                        disabled={!pagination.hasNextPage}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pagination.hasNextPage
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <FiPackage className="mx-auto text-gray-400" size={48} />
                  <p className="mt-4 text-gray-600 text-lg">No hay productos disponibles</p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const stock = product.stock || 0
                  const stockStatus = getStockStatus(stock)
                  
                  // Colores formales según el estado de stock
                  const headerGradient = stockStatus.color === 'green' 
                    ? 'from-slate-700 via-slate-600 to-slate-700'
                    : stockStatus.color === 'yellow'
                    ? 'from-amber-600 via-amber-500 to-amber-600'
                    : stockStatus.color === 'orange'
                    ? 'from-orange-600 via-orange-500 to-orange-600'
                    : 'from-red-700 via-red-600 to-red-700'
                  
                  return (
                    <div 
                      key={product.id} 
                      className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-300"
                    >
                      {/* Header de la Card con Colores Formales */}
                      <div className={`bg-gradient-to-br ${headerGradient} p-3 text-white relative`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold truncate mb-0.5">{product.name}</h3>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${stockStatus.bg} ${stockStatus.text} ${stockStatus.border} flex-shrink-0 ml-2`}>
                            {stockStatus.color === 'green' && <FiCheckCircle size={10} className="inline mr-0.5" />}
                            {stockStatus.color === 'yellow' && <FiAlertCircle size={10} className="inline mr-0.5" />}
                            {stockStatus.color === 'orange' && <FiAlertCircle size={10} className="inline mr-0.5" />}
                            {stockStatus.color === 'red' && <FiXCircle size={10} className="inline mr-0.5" />}
                            {stockStatus.label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-white/90 font-semibold">S/.</span>
                          <div className="text-xl font-bold">
                            {product.price?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                        <div className="text-xs text-white/80 mt-1">
                          Stock: {stock} unidades
                        </div>
                      </div>

                      {/* Imagen del Producto - Mejorada */}
                      <div className="relative bg-gray-50 p-2">
                        {product.image && 
                         product.image.trim() !== '' && 
                         !product.image.includes('via.placeholder.com') &&
                         !product.image.includes('source.unsplash.com') ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-28 object-cover rounded border border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              const fallback = e.target.nextElementSibling
                              if (fallback) fallback.classList.remove('hidden')
                            }}
                            onLoad={() => {
                              const fallback = e.target.nextElementSibling
                              if (fallback) fallback.classList.add('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-28 bg-gray-100 rounded border border-gray-200 flex items-center justify-center ${product.image && 
                         product.image.trim() !== '' && 
                         !product.image.includes('via.placeholder.com') &&
                         !product.image.includes('source.unsplash.com') ? 'hidden' : ''}`}>
                          <FiPackage size={32} className="text-gray-400" />
                        </div>
                      </div>

                      {/* Contenido de la Card - Más Compacto */}
                      <div className="p-3 space-y-2 bg-white">
                        {product.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">{product.description}</p>
                        )}
                        
                        {product.category && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <FiTag size={10} className="text-gray-400" />
                            <span className="text-gray-500">{product.category}</span>
                          </div>
                        )}
                        
                        {/* Badge de Stock Compacto */}
                        <div className={`inline-flex items-center justify-between w-full px-2 py-1.5 rounded border ${stockStatus.bg} ${stockStatus.text} ${stockStatus.border}`}>
                          <span className="text-xs font-medium">{stockStatus.label}</span>
                          <span className="text-sm font-bold">{stock}</span>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FiEdit size={14} />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FiTrash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            {pagination?.totalPages > 1 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-5 py-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Página {pagination.currentPage} de {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (pagination.hasPrevPage) {
                          setCurrentPage(currentPage - 1)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                      disabled={!pagination.hasPrevPage}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pagination.hasPrevPage
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Anterior
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return (
                            page === 1 ||
                            page === pagination.totalPages ||
                            (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)
                          )
                        })
                        .map((page, index, array) => {
                          const showEllipsis = index > 0 && array[index] - array[index - 1] > 1
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                              <button
                                onClick={() => {
                                  setCurrentPage(page)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  page === pagination.currentPage
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white hover:bg-green-50 text-gray-700 border border-gray-300'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          )
                        })}
                    </div>
                    <button
                      onClick={() => {
                        if (pagination.hasNextPage) {
                          setCurrentPage(currentPage + 1)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                      disabled={!pagination.hasNextPage}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pagination.hasNextPage
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <ProductModal
            editingProduct={editingProduct}
            formData={formData}
            setFormData={setFormData}
            uploading={uploading}
            handleImageUpload={handleImageUpload}
            handleSubmit={handleSubmit}
            onClose={() => {
              setFormData({ name: '', description: '', price: '', image: '', stock: '' })
              setEditingProduct(null)
              setShowModal(false)
            }}
          />
        )}

        {/* Modal de Importación */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Importar Productos desde Excel</h3>
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar archivo Excel
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFile}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  {importFile && (
                    <p className="mt-2 text-xs text-gray-600">
                      Archivo seleccionado: {importFile.name}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 mb-2">
                    <strong>Formato requerido:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li><strong>Nombre</strong> (requerido)</li>
                    <li><strong>Precio</strong> (requerido)</li>
                    <li>Descripción (opcional)</li>
                    <li>Stock (opcional, default: 0)</li>
                    <li>Categoría (opcional)</li>
                    <li>Imagen (URL, opcional)</li>
                  </ul>
                  <button
                    onClick={downloadTemplate}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Descargar formato de ejemplo
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowImportModal(false)
                      setImportFile(null)
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImportProducts}
                    disabled={!importFile || importing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {importing ? 'Importando...' : 'Importar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notificaciones */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 min-w-[300px] ${
                notification.type === 'success'
                  ? 'bg-green-500 text-white'
                  : notification.type === 'info'
                  ? 'bg-blue-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {notification.type === 'success' ? (
                <FiCheckCircle size={20} />
              ) : notification.type === 'info' ? (
                <FiInfo size={20} />
              ) : (
                <FiXCircle size={20} />
              )}
              <span className="flex-1 text-sm font-medium">{notification.message}</span>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="text-white hover:text-gray-200"
              >
                <FiX size={18} />
              </button>
            </div>
          ))}
        </div>
      </AdminLayout>
    </>
  )
}

// Componente Modal separado para manejar el estado local
function ProductModal({ editingProduct, formData, setFormData, uploading, handleImageUpload, handleSubmit, onClose }) {
  // Calcular datos del formulario directamente desde editingProduct usando useMemo
  const computedFormData = useMemo(() => {
    if (editingProduct) {
      const data = {
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        price: editingProduct.price != null ? String(editingProduct.price) : '',
        image: editingProduct.image || '',
        stock: editingProduct.stock != null ? String(editingProduct.stock) : '0',
        category: editingProduct.category || '',
      }
      return data
    }
    return { name: '', description: '', price: '', image: '', stock: '', category: '' }
  }, [editingProduct?.id, editingProduct?.name, editingProduct?.description, editingProduct?.price, editingProduct?.image, editingProduct?.stock, editingProduct?.category])

  // Estado local para las ediciones del usuario
  const [localFormData, setLocalFormData] = useState(computedFormData)
  const [hasUserEdited, setHasUserEdited] = useState(false)

  // Sincronizar cuando cambia computedFormData (cuando cambia el producto)
  useEffect(() => {
    setHasUserEdited(false)
    setLocalFormData(computedFormData)
  }, [computedFormData])

  // Sincronizar formData externo con localFormData para la imagen
  useEffect(() => {
    if (formData.image && formData.image !== localFormData.image) {
      setLocalFormData(prev => ({ ...prev, image: formData.image }))
    }
  }, [formData.image])

  const handleLocalImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB')
      return
    }

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (res.ok) {
        const data = await res.json()
        setLocalFormData(prev => ({ ...prev, image: data.url }))
        setFormData(prev => ({ ...prev, image: data.url }))
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('Error al subir:', errorData)
        alert(`Error al subir la imagen: ${errorData.error || errorData.details || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error uploading:', error)
      alert(`Error al subir la imagen: ${error.message || 'Error de conexión'}`)
    }
  }

  const handleLocalSubmit = async (e) => {
    e.preventDefault()
    // Usar computedFormData si no hay ediciones del usuario, sino usar localFormData
    const dataToSubmit = hasUserEdited ? localFormData : computedFormData
    console.log('🟡 handleLocalSubmit - dataToSubmit:', dataToSubmit)
    // Actualizar formData externo antes de submit
    setFormData(dataToSubmit)
    // Pasar los datos directamente al handleSubmit para evitar problemas de sincronización
    await handleSubmit(e, dataToSubmit)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-gray-900">
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          {editingProduct && (
            <p className="text-sm text-gray-500 mt-1">
              Editando: <span className="font-semibold">{editingProduct.name}</span>
            </p>
          )}
        </div>
        <form 
          onSubmit={handleLocalSubmit} 
          className="space-y-4"
        >
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={hasUserEdited ? localFormData?.name ?? '' : computedFormData?.name ?? ''}
                    onChange={(e) => {
                      console.log('🟡 onChange name - nuevo valor:', e.target.value)
                      setHasUserEdited(true)
                      setLocalFormData({ ...localFormData, name: e.target.value })
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    value={hasUserEdited ? localFormData?.description ?? '' : computedFormData?.description ?? ''}
                    onChange={(e) => {
                      setHasUserEdited(true)
                      setLocalFormData({ ...localFormData, description: e.target.value })
                    }}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-2">
                      Precio *
                    </label>
                    <input
                      id="edit-price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={hasUserEdited ? localFormData?.price ?? '' : computedFormData?.price ?? ''}
                      onChange={(e) => {
                        setHasUserEdited(true)
                        setLocalFormData({ ...localFormData, price: e.target.value })
                      }}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-stock" className="block text-sm font-medium text-gray-700 mb-2">
                      Stock
                    </label>
                    <input
                      id="edit-stock"
                      name="stock"
                      type="number"
                      value={hasUserEdited ? localFormData?.stock ?? '' : computedFormData?.stock ?? ''}
                      onChange={(e) => {
                        setHasUserEdited(true)
                        setLocalFormData({ ...localFormData, stock: e.target.value })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <input
                    id="edit-category"
                    name="category"
                    type="text"
                    value={hasUserEdited ? localFormData?.category ?? '' : computedFormData?.category ?? ''}
                    onChange={(e) => {
                      setHasUserEdited(true)
                      setLocalFormData({ ...localFormData, category: e.target.value })
                    }}
                    placeholder="Ej: Herramientas, Materiales, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen del Producto
                  </label>
                  <div className="space-y-3">
                    {/* Vista previa de la imagen actual */}
                    {localFormData.image && localFormData.image.trim() !== '' && (
                      <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Vista Previa:</p>
                        <div className="flex items-start gap-3">
                          <div className="relative w-32 h-32 bg-gray-200 rounded-lg border-2 border-gray-300 shadow-sm overflow-hidden">
                            <img
                              src={localFormData.image}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                const parent = e.target.parentElement
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                                }
                              }}
                              onLoad={() => {
                                console.log('✅ Imagen cargada exitosamente:', localFormData.image)
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 break-all mb-2">
                              {localFormData.image.startsWith('/uploads/') 
                                ? 'Imagen local' 
                                : localFormData.image.includes('unsplash.com')
                                ? 'Imagen de Unsplash'
                                : 'Imagen del producto'}
                            </p>
                            <p className="text-xs text-gray-400 break-all mb-2 font-mono">
                              {localFormData.image.length > 60 ? localFormData.image.substring(0, 60) + '...' : localFormData.image}
                            </p>
                            <button
                              type="button"
                              onClick={() => setLocalFormData({ ...localFormData, image: '' })}
                              className="text-xs text-red-600 hover:text-red-700 font-semibold"
                            >
                              ✕ Eliminar imagen
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subir archivo */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Subir imagen desde tu computadora
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLocalImageUpload}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-blue-400 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Formatos: JPG, PNG, GIF. Tamaño máximo: 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-semibold"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg transition-colors font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
  )
}
