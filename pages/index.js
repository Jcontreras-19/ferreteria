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
  // El banner se ajusta automáticamente a las dimensiones de las imágenes
  
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
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white" style={{ overflowX: 'hidden' }}>
        <Header />
        {/* Hero Section - Banner dividido en 2 mitades */}
        <section 
          className="bg-gradient-to-br from-green-50 to-emerald-100 overflow-hidden" 
          style={{ 
            width: '100vw',
            maxWidth: '100vw',
            marginLeft: 'calc((100% - 100vw) / 2)',
            marginRight: 'calc((100% - 100vw) / 2)',
            padding: 0,
            marginTop: 0,
            marginBottom: 0,
            position: 'relative'
          }}
        >
          <div className="flex flex-col lg:flex-row w-full" style={{ minHeight: '500px', maxHeight: '600px' }}>
            {/* Mitad Izquierda - Carrusel de Imágenes */}
            <div 
              className="w-full lg:w-1/2 bg-white relative overflow-hidden"
              style={{ 
                height: '500px',
                position: 'relative'
              }}
            >
              {heroImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentHeroImage 
                      ? 'opacity-100 z-10' 
                      : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Imagen ${index + 1} - Corporación GRC`}
                    className="w-full h-full object-contain"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      display: 'block'
                    }}
                  />
                </div>
              ))}
              {/* Indicadores del carrusel */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentHeroImage(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentHeroImage 
                        ? 'w-8 bg-green-600' 
                        : 'w-2 bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Mitad Derecha - Categorías en Círculos */}
            <div 
              className="w-full lg:w-1/2 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 p-8 md:p-12 flex items-center justify-center"
              style={{ height: '500px' }}
            >
              <div className="w-full max-w-2xl">
                <h2 className="text-white text-3xl md:text-4xl font-bold mb-8 text-center">
                  Nuestras Categorías
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {categories.slice(0, 6).map((category, index) => {
                    const config = categoryConfig[category] || categoryConfig['Otros']
                    const Icon = config.icon
                    return (
                      <button
                        key={category}
                        onClick={() => goToCategory(category)}
                        className="group flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                          <Icon className="text-white" size={32} />
                        </div>
                        <span className="text-white text-sm md:text-base font-semibold text-center group-hover:text-green-200 transition-colors">
                          {category.length > 15 ? `${category.substring(0, 15)}...` : category}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {categories.length === 0 && (
                  <div className="text-center text-white/80">
                    <p>Cargando categorías...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        <main className="flex-1 pt-8 pb-8">


          {/* Carrusel de Productos Destacados */}
          <section className="bg-gradient-to-br from-white via-green-50 to-emerald-50 py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                    Productos Destacados
                  </h2>
                  <p className="text-gray-600">Los mejores productos para tus proyectos</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevSlide}
                    className="p-3 rounded-full bg-green-600 hover:bg-green-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110"
                    aria-label="Anterior"
                  >
                    <FiChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="p-3 rounded-full bg-green-600 hover:bg-green-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110"
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
