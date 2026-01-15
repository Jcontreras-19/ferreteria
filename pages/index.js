import { useState, useEffect } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      // Agregar timestamp para evitar caché
      const res = await fetch(`/api/productos?limit=1000&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      const data = await res.json()
      console.log('Productos recibidos:', data)
      
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
      setProducts(sortedData.slice(0, 8)) // Mostrar solo los primeros 8 productos
      setLoading(false)
    } catch (error) {
      console.error('Error fetching products:', error)
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Corporación GRC - Ferretería</title>
        <meta name="description" content="Corporación GRC - SERVICIOS DE APOYO A LAS EMPRESAS. ISO 9001:2015" />
      </Head>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 pb-8">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-green-600 to-green-800 py-6 md:py-10">
            <div className="container mx-auto px-4 text-center">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="flex items-center justify-center w-14 h-14 bg-white/10 rounded-full border-2 border-white/30 backdrop-blur-sm">
                  <span className="text-white font-bold text-lg">GRC</span>
                </div>
                <div className="text-left">
                  <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                    Corporación GRC
                  </h1>
                  <p className="text-xs md:text-sm text-green-100">
                    ISO 9001:2015 Certificado
                  </p>
                </div>
              </div>
              <p className="text-base md:text-lg mb-4 text-green-100">
                SERVICIOS DE APOYO A LAS EMPRESAS
              </p>
              <a
                href="/productos"
                className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold text-sm hover:bg-green-50 transition-colors inline-block shadow-md"
              >
                Ver Productos
              </a>
            </div>
          </section>

          {/* Productos Destacados */}
          <section className="container mx-auto px-4 py-12">
            <h2 className="text-3xl font-bold mb-8 text-center">Productos Destacados</h2>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Cargando productos...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No hay productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
            <div className="text-center mt-8">
              <a
                href="/productos"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
              >
                Ver Todos los Productos
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

