import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import { FiChevronLeft, FiChevronRight, FiZap, FiTool, FiHome, FiDroplet, FiShield, FiTruck, FiStar, FiTrendingUp } from 'react-icons/fi'

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentHeroImage, setCurrentHeroImage] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const carouselRef = useRef(null)
  const autoPlayRef = useRef(null)
  const heroImageRef = useRef(null)

  // Imágenes para el carrusel del hero (imágenes locales desde public/hero-imagenes)
  // Estas imágenes cambian automáticamente cada 5 segundos
  const heroImages = [
    '/hero-imagenes/herramientas.png', // Imagen 1 - herramientas
    '/hero-imagenes/envio_rapidos.png', // Imagen 2 - envio_rapidos
    '/hero-imagenes/calidad.png', // Imagen 3 - calidad
    '/hero-imagenes/proyecto.png', // Imagen 4 - proyectos
  ]

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

  // Auto-play del carrusel de productos
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

  // Auto-play del carrusel de imágenes del hero
  useEffect(() => {
    const heroInterval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length)
    }, 5000) // Cambia cada 5 segundos
    
    return () => clearInterval(heroInterval)
  }, [heroImages.length])

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
    if (category && category.trim() !== '') {
      window.location.href = `/productos?category=${encodeURIComponent(category)}`
    }
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
          {/* Categorías en la parte superior - Diseño profesional y realista */}
          <section className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 shadow-sm py-3">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 md:gap-5 overflow-x-auto pb-2 scrollbar-hide">
                {categories.slice(0, 8).map((category, index) => {
                  const config = categoryConfig[category] || categoryConfig['Otros']
                  const Icon = config.icon
                  return (
                    <button
                      key={category}
                      onClick={() => goToCategory(category)}
                      className="flex items-center gap-3 flex-shrink-0 group cursor-pointer"
                    >
                      {/* Icono circular con efecto 3D y sombra realista */}
                      <div className={`relative w-12 h-12 md:w-14 md:h-14 ${config.bgColor} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-1`}
                        style={{
                          background: `linear-gradient(135deg, ${config.bgColor.replace('bg-', '')} 0%, ${config.bgColor.replace('bg-', '')}dd 100%)`,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 -2px 4px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <Icon className="text-white drop-shadow-md" size={20} />
                        {/* Brillo superior para efecto 3D */}
                        <div className="absolute top-1 left-1 w-4 h-4 bg-white/30 rounded-full blur-sm"></div>
                      </div>
                      {/* Botón de texto con diseño profesional */}
                      <span className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2 rounded-lg text-xs md:text-sm transition-all duration-300 whitespace-nowrap border border-gray-200 shadow-sm group-hover:shadow-md group-hover:border-gray-300 group-hover:text-gray-900 transform group-hover:scale-105"
                        style={{
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        {category}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Hero Section - Banner con imagen completa */}
          <section className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 overflow-hidden">
            {/* Carrusel de Imágenes - Ocupa todo el espacio */}
            <div className="relative w-full h-64 md:h-80 lg:h-96">
              <div className="relative w-full h-full">
                {heroImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      index === currentHeroImage ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`Imagen ${index + 1} - Corporación GRC`}
                      fill
                      className="object-cover"
                      priority={index === 0}
                      unoptimized
                    />
                  </div>
                ))}
                
                {/* Indicadores del carrusel */}
                {heroImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
                    {heroImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentHeroImage(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === currentHeroImage
                            ? 'w-8 bg-white'
                            : 'w-2 bg-white/50'
                        }`}
                        aria-label={`Ir a imagen ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
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
