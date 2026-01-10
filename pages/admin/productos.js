import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { FiEdit, FiTrash2, FiPlus, FiDownload, FiSearch, FiFilter, FiGrid, FiList, FiEye, FiPackage, FiDollarSign, FiTrendingUp, FiAlertCircle } from 'react-icons/fi'
import Image from 'next/image'

export default function AdminProductos() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    stock: '',
  })
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'

  useEffect(() => {
    checkAuth()
    fetchProducts()
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

  const fetchProducts = async () => {
    try {
      const url = searchQuery
        ? `/api/productos?search=${encodeURIComponent(searchQuery)}`
        : '/api/productos'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [searchQuery])

  // Efecto para asegurar que los datos se carguen cuando se abre el modal o cambia el producto
  useEffect(() => {
    if (showModal && editingProduct) {
      const productData = {
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        price: editingProduct.price != null ? String(editingProduct.price) : '',
        image: editingProduct.image || '',
        stock: editingProduct.stock != null ? String(editingProduct.stock) : '0',
      }
      console.log('🟢 useEffect - Cargando datos del producto:', productData)
      // Forzar actualización de formData
      setFormData(productData)
    } else if (showModal && !editingProduct) {
      // Limpiar formulario para nuevo producto
      setFormData({ name: '', description: '', price: '', image: '', stock: '' })
    }
  }, [showModal, editingProduct])

  const handleEdit = (product) => {
    console.log('🔵 handleEdit - Producto recibido:', product)
    // Preparar los datos del producto para el formulario
    const productData = {
      name: product.name || '',
      description: product.description || '',
      price: product.price != null ? String(product.price) : '',
      image: product.image || '',
      stock: product.stock != null ? String(product.stock) : '0',
    }
    console.log('🔵 handleEdit - Datos preparados:', productData)
    
    // CRÍTICO: Establecer los datos del formulario PRIMERO
    setFormData(productData)
    // Luego establecer el producto a editar
    setEditingProduct(product)
    console.log('🔵 handleEdit - Estados establecidos, abriendo modal...')
    // Abrir el modal - los datos ya están en formData
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchProducts()
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
        // Forzar actualización de la lista de productos
        await fetchProducts()
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

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calcular estadísticas
  const stats = {
    total: products.length,
    withStock: products.filter(p => (p.stock || 0) > 0).length,
    withoutStock: products.filter(p => (p.stock || 0) === 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0),
  }

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
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">GESTIÓN DE PRODUCTOS</h1>
                <p className="text-gray-600 text-xs mt-0.5">
                  {products.length} producto{products.length !== 1 ? 's' : ''} en total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de cards"
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de tabla"
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>

            {/* Estadísticas Compactas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-800 text-xs font-semibold">Total</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <FiPackage className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-800 text-xs font-semibold">Con Stock</span>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <FiTrendingUp className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.withStock}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border-2 border-red-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-red-800 text-xs font-semibold">Sin Stock</span>
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                    <FiAlertCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-900">{stats.withoutStock}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-800 text-xs font-semibold">Valor Total</span>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <FiDollarSign className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-900">S/. {stats.totalValue.toFixed(2)}</p>
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
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      Filtros activos
                    </span>
                  )}
                </div>

                {/* Búsqueda */}
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    style={{ color: '#111827' }}
                  />
                </div>

                {/* Botones de Exportar y Nuevo */}
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => {
                    const emptyData = { name: '', description: '', price: '', image: '', stock: '' }
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
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
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
                      <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
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
                              {product.image ? (
                                <Image
                                  src={product.image}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <FiPackage size={24} />
                                </div>
                              )}
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <FiPackage className="mx-auto text-gray-400" size={48} />
                  <p className="mt-4 text-gray-600 text-lg">No hay productos disponibles</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden">
                    <div className="relative h-48 bg-gray-100">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <FiPackage size={48} />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-green-600">S/. {product.price?.toFixed(2) || '0.00'}</span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                            (product.stock || 0) > 10
                              ? 'bg-green-100 text-green-800'
                              : (product.stock || 0) > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          Stock: {product.stock || 0}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <FiEye size={14} />
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
                ))
              )}
            </div>
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
      }
      console.log('🟡 ProductModal useMemo - Datos calculados:', data)
      return data
    }
    return { name: '', description: '', price: '', image: '', stock: '' }
  }, [editingProduct?.id, editingProduct?.name, editingProduct?.description, editingProduct?.price, editingProduct?.image, editingProduct?.stock])

  // Estado local para las ediciones del usuario
  const [localFormData, setLocalFormData] = useState(computedFormData)
  const [hasUserEdited, setHasUserEdited] = useState(false)

  // Sincronizar cuando cambia computedFormData (cuando cambia el producto)
  useEffect(() => {
    console.log('🟡 ProductModal useEffect - computedFormData:', computedFormData)
    console.log('🟡 ProductModal useEffect - Reseteando hasUserEdited y actualizando localFormData')
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
        {(() => {
          console.log('🟡 RENDER FORM - localFormData:', localFormData)
          console.log('🟡 RENDER FORM - computedFormData:', computedFormData)
          console.log('🟡 RENDER FORM - editingProduct:', editingProduct)
          return null
        })()}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen del Producto
                  </label>
                  <div className="space-y-3">
                    {/* Vista previa de la imagen actual */}
                    {localFormData.image && (
                      <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Vista Previa:</p>
                        <div className="flex items-start gap-3">
                          <img
                            src={localFormData.image}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 break-all mb-2">
                              {localFormData.image.startsWith('/uploads/') 
                                ? 'Imagen local' 
                                : 'Imagen del producto'}
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
