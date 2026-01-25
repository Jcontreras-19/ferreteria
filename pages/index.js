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

  // Textos relacionados con cada imagen del carrusel
  const heroTexts = [
    {
      title: 'Herramientas Profesionales',
      subtitle: 'Para tus Proyectos',
      description: 'Contamos con las mejores herramientas manuales y eléctricas del mercado. Calidad garantizada para profesionales y aficionados.',
      features: ['Herramientas de alta calidad', 'Marcas reconocidas', 'Stock disponible']
    },
    {
      title: 'Envío Rápido',
      subtitle: 'A Todo el País',
      description: 'Entregamos tus pedidos de forma rápida y segura. Servicio de envío eficiente para que recibas tus productos cuando los necesites.',
      features: ['Envío nacional', 'Entrega rápida', 'Embalaje seguro']
    },
    {
      title: 'Calidad Garantizada',
      subtitle: 'ISO 9001:2015',
      description: 'Corporación GRC cuenta con certificación ISO 9001:2015, garantizando la más alta calidad en todos nuestros productos y servicios.',
      features: ['Certificación ISO', 'Calidad verificada', 'Satisfacción garantizada']
    },
    {
      title: 'Equipamos tu Proyecto',
      subtitle: 'Soluciones Completas',
      description: 'Desde materiales de construcción hasta herramientas especializadas. Todo lo que necesitas para hacer realidad tu proyecto.',
      features: ['Productos completos', 'Asesoría profesional', 'Soluciones a medida']
    }
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
          className="bg-white" 
          style={{ 
            width: '100vw',
            maxWidth: '100vw',
            marginLeft: 'calc((100% - 100vw) / 2)',
            marginRight: 'calc((100% - 100vw) / 2)',
            paddingTop: '0',
            paddingBottom: '0',
            marginTop: '80px',
            marginBottom: 0,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div className="flex flex-col lg:flex-row w-full" style={{ height: '400px' }}>
            {/* Lado Izquierdo - Carrusel de Imágenes (45% del ancho) */}
            <div 
              className="w-full lg:w-[45%] bg-white relative"
              style={{ 
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                padding: 0,
                margin: 0,
                flexShrink: 0
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
                  style={{
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: 0,
                    margin: 0
                  }}
                >
                  <img
                    src={image}
                    alt={`Imagen ${index + 1} - Corporación GRC`}
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                      margin: 0,
                      padding: 0,
                      imageRendering: 'high-quality',
                      imageRendering: '-webkit-optimize-contrast'
                    }}
                    loading="eager"
                    decoding="async"
                  />
                </div>
              ))}
            </div>

            {/* Lado Derecho - Texto sincronizado (55% del ancho) */}
            <div 
              className="w-full lg:w-[55%] bg-white flex items-center justify-center border-l border-gray-200"
              style={{ height: '400px', overflow: 'auto', position: 'relative', padding: '24px' }}
            >
              <div className="w-full" style={{ position: 'relative', maxHeight: '100%' }}>
                {heroTexts.map((text, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-1000 ${
                      index === currentHeroImage 
                        ? 'opacity-100 translate-y-0 block' 
                        : 'opacity-0 translate-y-4 absolute pointer-events-none hidden'
                    }`}
                    style={{
                      width: '100%',
                      padding: 0,
                      margin: 0
                    }}
                  >
                    <div className="space-y-4">
                      {/* Subtítulo */}
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest" style={{ letterSpacing: '0.15em', margin: 0, padding: 0 }}>
                        {text.subtitle}
                      </p>
                      
                      {/* Título principal */}
                      <h2 className="text-gray-900 text-2xl md:text-3xl font-bold leading-tight" style={{ lineHeight: '1.3', fontWeight: '700', margin: 0, padding: 0 }}>
                        {text.title}
                      </h2>
                      
                      {/* Línea decorativa */}
                      <div className="w-12 h-0.5 bg-gradient-to-r from-green-600 to-emerald-600" style={{ margin: '8px 0' }}></div>
                      
                      {/* Descripción */}
                      <p className="text-gray-600 text-sm md:text-base leading-relaxed" style={{ lineHeight: '1.6', margin: 0, padding: 0 }}>
                        {text.description}
                      </p>
                      
                      {/* Características */}
                      <div className="space-y-2">
                        {text.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2.5" style={{ margin: 0, padding: 0 }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 flex-shrink-0" style={{ marginTop: '6px' }}></div>
                            <span className="text-gray-700 text-sm md:text-base" style={{ lineHeight: '1.5', margin: 0, padding: 0 }}>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Botón CTA */}
                      <button 
                        onClick={() => window.location.href = '/productos'}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] text-sm md:text-base"
                        style={{ marginTop: '16px' }}
                      >
                        Ver Productos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <main className="flex-1 pt-2 pb-8">


          {/* Carrusel de Productos Destacados - Rediseño Moderno */}
          <section className="bg-gray-900 py-12 md:py-16">
            <div className="container mx-auto px-4">
              {/* Header centrado */}
              <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Productos Destacados
                </h2>
                <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
                  Los mejores productos para tus proyectos
                </p>
                {/* Línea decorativa */}
                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent mx-auto mt-4"></div>
              </div>

              {/* Controles de navegación centrados */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <button
                  onClick={prevSlide}
                  className="p-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all duration-300 border border-gray-700 hover:border-green-500 transform hover:scale-110 active:scale-95"
                  aria-label="Anterior"
                >
                  <FiChevronLeft size={22} />
                </button>
                <div className="flex gap-1.5">
                  {Array.from({ length: Math.ceil(featuredProducts.length / 4) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index * 4)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        Math.floor(currentSlide / 4) === index
                          ? 'w-6 bg-green-500'
                          : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextSlide}
                  className="p-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all duration-300 border border-gray-700 hover:border-green-500 transform hover:scale-110 active:scale-95"
                  aria-label="Siguiente"
                >
                  <FiChevronRight size={22} />
                </button>
              </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                <p className="text-gray-400 mt-4">Cargando productos...</p>
              </div>
            ) : featuredProducts.length === 0 ? (
              <div className="text-center py-16">
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
                    <div key={product.id} className="w-full sm:w-1/2 lg:w-1/4 flex-shrink-0 px-3">
                      <div className="animate-fade-in transform transition-all duration-300 hover:scale-105" style={{ animationDelay: `${index * 100}ms` }}>
                        <ProductCard product={product} darkMode={true} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

              <div className="text-center mt-12">
                <a
                  href="/productos"
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border border-green-500/50"
                >
                  Ver Todos los Productos
                  <FiChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </a>
              </div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
    </>
  )
}
