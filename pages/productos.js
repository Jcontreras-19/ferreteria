import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'

export default function Productos() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const search = router.query.search || ''
    const category = router.query.category || ''
    setSearchQuery(search)
    fetchProducts(search, category)
  }, [router.query.search, router.query.category])

  const fetchProducts = async (search = '', category = '') => {
    try {
      setLoading(true)
      let url = '/api/productos?limit=1000'
      const params = []
      
      if (search) {
        params.push(`search=${encodeURIComponent(search)}`)
      }
      if (category) {
        params.push(`category=${encodeURIComponent(category)}`)
      }
      
      if (params.length > 0) {
        url += '&' + params.join('&')
      }
      
      const res = await fetch(url)
      const data = await res.json()
      
      // La API ahora devuelve { products, pagination }
      const productsArray = data.products || (Array.isArray(data) ? data : [])
      
      // Ordenar: productos con imagen primero, pero manteniendo orden cronológico
      const sortedData = [...productsArray].sort((a, b) => {
        const aHasImage = a.image && a.image.trim() !== ''
        const bHasImage = b.image && b.image.trim() !== ''
        if (aHasImage && !bHasImage) return -1
        if (!aHasImage && bHasImage) return 1
        // Si ambos tienen imagen o ambos no tienen, mantener orden cronológico (más antiguos primero)
        return 0
      })
      setProducts(sortedData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching products:', error)
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/productos?search=${encodeURIComponent(searchQuery)}`)
    } else {
      router.push('/productos')
    }
  }

  return (
    <>
      <Head>
        <title>Productos - Ferretería</title>
        <meta name="description" content="Catálogo de productos" />
      </Head>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 pb-8">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">
              {router.query.category 
                ? `Productos - ${router.query.category}` 
                : 'Catálogo de Productos'}
            </h1>
            {router.query.category && (
              <button
                onClick={() => router.push('/productos')}
                className="mb-4 text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
              >
                ← Ver todos los productos
              </button>
            )}

            {/* Buscador */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition-colors font-semibold"
                >
                  Buscar
                </button>
                {router.query.search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      router.push('/productos')
                    }}
                    className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </form>

            {/* Lista de productos */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Cargando productos...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-xl">
                  {router.query.search
                    ? 'No se encontraron productos con ese criterio de búsqueda'
                    : 'No hay productos disponibles'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-400 mb-4">
                  {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}

