import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import { FiChevronLeft, FiChevronRight, FiZap, FiTool, FiHome, FiDroplet, FiShield, FiTruck, FiStar, FiTrendingUp } from 'react-icons/fi'

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const carouselRef = useRef(null)
  const autoPlayRef = useRef(null)

  // Categorías con iconos y colores
  const categoryConfig = {
    'Herramientas Manuales': { icon: FiTool, color: 'from-blue-500 to-blue-700', bgColor: 'bg-blue-500' },
    'Herramientas Eléctricas': { icon: FiZap, color: 'from-yellow-500 to-orange-600', bgColor: 'bg-yellow-500' },
    'Materiales de Construcción': { icon: FiHome, color: 'from-gray-600 to-gray-800', bgColor: 'bg-gray-600' },
    'Pinturas y Acabados': { icon: FiDroplet, color: 'from-purple-500 to-pink-600', bgColor: 'bg-purple-500' },
    'Seguridad y Protección': { icon: FiShield, color: 'from-red-500 to-red-700', bgColor: 'bg-red-500' },
    'Otros': { icon: FiStar, color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-500' }
  }

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // Auto-play del carrusel
  useEffect(() => {
    if (isAutoPlaying && products.length > 0) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % Math.min(products.length, 8))
      }, 4000)
    }
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }
  }, [isAutoPlaying, products.length])

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/productos?limit=1000&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      const data = await res.json()
      const productsArray = data.products || (Array.isArray(data) ? data : [])
      
      const sortedData = [...productsArray].sort((a, b) => {
        const aHasImage = a.image && a.image.trim() !== ''
        const bHasImage = b.image && b.image.trim() !== ''
        if (aHasImage && !bHasImage) return -1
        if (!aHasImage && bHasImage) return 1
        return 0
      })
      
      setProducts(sortedData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching products:', error)
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/productos?limit=1000&t=${Date.now()}`)
      const data = await res.json()
      const productsArray = data.products || (Array.isArray(data) ? data : [])
      
      // Obtener categorías únicas
      const uniqueCategories = [...new Set(productsArray
        .map(p => p.category)
        .filter(c => c && c.trim() !== '')
      )]
      
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const featuredProducts = products.filter(p => p.image && p.image.trim() !== '').slice(0, 8)
  const displayProducts = featuredProducts.slice(0, 4)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredProducts.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToCategory = (category) => {
    window.location.href = `/productos?category=${encodeURIComponent(category)}`
  }

  return (
    <>
      <Head>
        <title>Corporación GRC - Ferretería</title>
        <meta name="description" content="Corporación GRC - SERVICIOS DE APOYO A LAS EMPRESAS. ISO 9001:2015" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
        <Header />
        <main className="flex-1 pt-20 pb-8">
          {/* Banner de Aviso Llamativo */}
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white py-3 px-4 animate-slide-down">
            <div className="container mx-auto flex items-center justify-center gap-3">
              <FiTrendingUp className="animate-pulse" size={20} />
              <p className="text-sm md:text-base font-semibold">
                🎉 ¡Ofertas Especiales! Envío gratis en compras mayores a S/. 500
              </p>
              <FiTrendingUp className="animate-pulse" size={20} />
            </div>
          </div>

          {/* Hero Section Mejorado */}
          <section className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 py-16 md:py-24 overflow-hidden">
            {/* Elementos decorativos animados */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            
            <div className="container mx-auto px-4 text-center relative z-10">
              <div className="flex items-center justify-center space-x-4 mb-6 animate-fade-in">
                <div className="flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full border-4 border-white/30 shadow-2xl transform hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-2xl">GRC</span>
                </div>
                <div className="text-left">
                  <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-2 animate-slide-up">
                    Corporación GRC
                  </h1>
                  <div className="flex items-center gap-2">
                    <FiShield className="text-white/90" size={18} />
                    <p className="text-sm md:text-base text-green-100 font-medium">
                      ISO 9001:2015 Certificado
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-xl md:text-2xl mb-8 text-green-100 font-medium animate-slide-up delay-200">
                SERVICIOS DE APOYO A LAS EMPRESAS
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up delay-300">
                <a
                  href="/productos"
                  className="group bg-white text-green-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-50 transition-all duration-300 shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 hover:-translate-y-1"
                >
                  <span className="flex items-center gap-2">
                    Ver Productos
                    <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
                <a
                  href="/productos"
                  className="group border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                >
                  Explorar Catálogo
                </a>
              </div>
            </div>
          </section>

          {/* Globos de Categorías Interactivos */}
          <section className="container mx-auto px-4 py-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-800">
              Explora por Categorías
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {categories.slice(0, 6).map((category, index) => {
                const config = categoryConfig[category] || categoryConfig['Otros']
                const Icon = config.icon
                return (
                  <button
                    key={category}
                    onClick={() => goToCategory(category)}
                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-2 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${config.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Icon className="text-white" size={28} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-white transition-colors duration-300 text-center line-clamp-2">
                        {category}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Carrusel de Productos Destacados */}
          <section className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                Productos Destacados
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                  aria-label="Anterior"
                >
                  <FiChevronLeft size={24} />
                </button>
                <button
                  onClick={nextSlide}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                  aria-label="Siguiente"
                >
                  <FiChevronRight size={24} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
                <p className="text-gray-400 mt-4">Cargando productos...</p>
              </div>
            ) : featuredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No hay productos disponibles</p>
              </div>
            ) : (
              <div className="relative overflow-hidden">
                <div 
                  ref={carouselRef}
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 25}%)` }}
                >
                  {featuredProducts.map((product, index) => (
                    <div key={product.id} className="w-full sm:w-1/2 lg:w-1/4 flex-shrink-0 px-2">
                      <div className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <ProductCard product={product} />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Indicadores del carrusel */}
                <div className="flex justify-center gap-2 mt-6">
                  {Array.from({ length: Math.ceil(featuredProducts.length / 4) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index * 4)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        Math.floor(currentSlide / 4) === index
                          ? 'w-8 bg-green-600'
                          : 'w-2 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="text-center mt-8">
              <a
                href="/productos"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Ver Todos los Productos
                <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </section>

          {/* Banner de Beneficios */}
          <section className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-12">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-center gap-4 animate-fade-in">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiTruck size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Envío Rápido</h3>
                    <p className="text-gray-300 text-sm">Entrega en 24-48 horas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 animate-fade-in delay-200">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiShield size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Garantía Total</h3>
                    <p className="text-gray-300 text-sm">Productos certificados</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 animate-fade-in delay-400">
                  <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiStar size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Calidad Premium</h3>
                    <p className="text-gray-300 text-sm">ISO 9001:2015</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
