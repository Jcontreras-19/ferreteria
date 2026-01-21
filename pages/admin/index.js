import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from 'recharts'
import { 
  FiPackage, FiFileText, FiUsers, FiTrendingUp, FiTrendingDown, 
  FiShoppingCart, FiAlertCircle, FiCheckCircle, FiClock, FiCalendar,
  FiFilter, FiRefreshCw, FiDollarSign, FiUser, FiBarChart2
} from 'react-icons/fi'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('month') // 'week', 'month', 'year'
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, period])

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

  const fetchStats = async () => {
    try {
      setRefreshing(true)
      const res = await fetch(`/api/admin/stats?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'Semana'
      case 'month': return 'Mes'
      case 'year': return 'Año'
      default: return 'Mes'
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

  return (
    <>
      <Head>
        <title>Dashboard - Panel Administrador</title>
      </Head>
      <AdminLayout user={user} onLogout={handleLogout}>
        <div className="space-y-6">
          {/* Header con Filtros de Período */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Dashboard Ejecutivo</h1>
                <p className="text-blue-100">Vista general del negocio</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <FiFilter size={18} />
                  <span className="text-sm font-medium">Período:</span>
                </div>
                <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-1">
                  <button
                    onClick={() => setPeriod('week')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      period === 'week'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setPeriod('month')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      period === 'month'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    onClick={() => setPeriod('year')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      period === 'year'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    Año
                  </button>
                </div>
                <button
                  onClick={fetchStats}
                  disabled={refreshing}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
                  title="Actualizar datos"
                >
                  <FiRefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Cards de Métricas Mejoradas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Productos"
              value={stats?.totalProducts || 0}
              icon={FiPackage}
              color="blue"
              trend={null}
            />
            <MetricCard
              title={`Cotizaciones (${getPeriodLabel()})`}
              value={stats?.totalQuotes || 0}
              icon={FiFileText}
              color="green"
              trend={null}
            />
            <MetricCard
              title="Total Clientes"
              value={stats?.totalClients || 0}
              icon={FiUsers}
              color="purple"
              trend={null}
            />
            <MetricCard
              title={`Ingresos (${getPeriodLabel()})`}
              value={`S/. ${(stats?.totalRevenue || 0).toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              icon={FiTrendingUp}
              color="yellow"
              trend={null}
            />
          </div>

          {/* Segunda Fila de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Ingresos Totales"
              value={`S/. ${(stats?.totalRevenueAll || 0).toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              icon={FiDollarSign}
              color="emerald"
              trend={null}
            />
            <MetricCard
              title="Promedio Cotización"
              value={`S/. ${(stats?.avgQuoteValue || 0).toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              icon={FiBarChart2}
              color="indigo"
              trend={null}
            />
            <MetricCard
              title="Productos Bajo Stock"
              value={stats?.lowStockProducts || 0}
              icon={FiAlertCircle}
              color="red"
              trend={null}
            />
            <MetricCard
              title="Clientes Activos"
              value={stats?.clientsWithQuotes || 0}
              icon={FiUser}
              color="cyan"
              trend={null}
            />
          </div>

          {/* Gráficos Principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Cotizaciones e Ingresos por Período */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    Cotizaciones e Ingresos
                  </h3>
                  <p className="text-sm text-gray-500">Evolución por {getPeriodLabel().toLowerCase()}</p>
                </div>
              </div>
              {stats?.timeSeriesData && stats.timeSeriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={stats.timeSeriesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      stroke="#9CA3AF"
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      stroke="#9CA3AF"
                      label={{ value: 'Cotizaciones', angle: -90, position: 'insideLeft', style: { fill: '#6B7280', fontSize: '12px' } }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      stroke="#9CA3AF"
                      label={{ value: 'Ingresos (S/.)', angle: 90, position: 'insideRight', style: { fill: '#6B7280', fontSize: '12px' } }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                      formatter={(value, name) => {
                        if (name === 'revenue') {
                          return [`S/. ${parseFloat(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Ingresos']
                        }
                        return [value, 'Cotizaciones']
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="count" 
                      name="Cotizaciones"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="revenue" 
                      name="Ingresos"
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ fill: '#10B981', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-320 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg">No hay datos disponibles</p>
                    <p className="text-sm mt-1">Los datos aparecerán aquí</p>
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico de Cotizaciones por Estado */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Estado de Cotizaciones
                </h3>
                <p className="text-sm text-gray-500">Distribución actual</p>
              </div>
              {stats?.quotesByStatus ? (
                (() => {
                  const pieData = [
                    { name: 'Pendientes', value: stats.quotesByStatus.pending || 0, color: '#F59E0B' },
                    { name: 'Aprobadas', value: stats.quotesByStatus.approved || 0, color: '#3B82F6' },
                    { name: 'Autorizadas', value: stats.quotesByStatus.authorized || 0, color: '#8B5CF6' },
                    { name: 'Enviadas', value: stats.quotesByStatus.sent || 0, color: '#06B6D4' },
                    { name: 'Completadas', value: stats.quotesByStatus.completed || 0, color: '#10B981' },
                    { name: 'Rechazadas', value: stats.quotesByStatus.rejected || 0, color: '#EF4444' },
                  ].filter(item => item.value > 0)
                  
                  return pieData.length > 0 ? (
                    <div>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) =>
                              `${name}\n${value} (${(percent * 100).toFixed(0)}%)`
                            }
                            outerRadius={100}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                            formatter={(value, name) => [`${value} cotizaciones`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 flex flex-wrap justify-center gap-3">
                        {pieData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: entry.color }}
                            ></div>
                            <span className="text-sm text-gray-700 font-medium">
                              {entry.name}: <span className="font-bold">{entry.value}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-320 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-lg">No hay cotizaciones registradas</p>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="h-320 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg">Cargando información...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Ingresos por Mes */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Ingresos por Mes (Últimos 6 meses)
              </h3>
              <p className="text-sm text-gray-500">Evolución de ingresos mensuales</p>
            </div>
            {stats?.revenueData && stats.revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={stats.revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                    label={{ value: 'Ingresos (S/.)', angle: -90, position: 'insideLeft', style: { fill: '#6B7280', fontSize: '12px' } }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    formatter={(value) => [`S/. ${parseFloat(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Ingresos']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Ingresos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-350 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-lg">No hay datos de ingresos disponibles</p>
                </div>
              </div>
            )}
          </div>

          {/* Productos Más Cotizados */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Top 10 Productos Más Cotizados
              </h3>
              <p className="text-sm text-gray-500">Productos más solicitados en cotizaciones</p>
            </div>
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={stats.topProducts.slice(0, 10)} 
                  margin={{ top: 30, right: 30, left: 60, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={140}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                    label={{ value: 'Veces cotizado', angle: -90, position: 'insideLeft', style: { fill: '#6B7280', fontSize: '12px' } }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      padding: '12px',
                      maxWidth: '300px'
                    }}
                    labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '8px', wordBreak: 'break-word' }}
                    formatter={(value) => [`${value} ${value === 1 ? 'vez' : 'veces'}`, 'Cotizado']}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <Bar 
                    dataKey="quoteCount" 
                    name="Veces cotizado"
                    radius={[8, 8, 0, 0]}
                    label={{ 
                      position: 'top', 
                      fill: '#374151', 
                      fontSize: 11, 
                      fontWeight: 'bold',
                    }}
                  >
                    {stats.topProducts.slice(0, 10).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-400 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-lg">No hay productos cotizados aún</p>
                  <p className="text-sm mt-1">Los productos más cotizados aparecerán aquí</p>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico Histórico de Cotizaciones */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Cotizaciones por Mes (Histórico)
              </h3>
              <p className="text-sm text-gray-500">Evolución mensual de cotizaciones - Últimos 6 meses</p>
            </div>
            {stats?.monthlyData ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={stats.monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    name="Cotizaciones"
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    name="Cotizaciones"
                    dot={{ fill: '#3B82F6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-320 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-lg">No hay datos disponibles</p>
                  <p className="text-sm mt-1">Las cotizaciones aparecerán aquí</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  )
}

function MetricCard({ title, value, icon: Icon, color, trend }) {
  const colorConfig = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-300',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      text: 'text-blue-900',
      title: 'text-blue-800'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      border: 'border-green-300',
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
      text: 'text-green-900',
      title: 'text-green-800'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      border: 'border-purple-300',
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      text: 'text-purple-900',
      title: 'text-purple-800'
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      border: 'border-yellow-300',
      iconBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      text: 'text-yellow-900',
      title: 'text-yellow-800'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      border: 'border-emerald-300',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      text: 'text-emerald-900',
      title: 'text-emerald-800'
    },
    indigo: {
      bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
      border: 'border-indigo-300',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      text: 'text-indigo-900',
      title: 'text-indigo-800'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      border: 'border-red-300',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
      text: 'text-red-900',
      title: 'text-red-800'
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
      border: 'border-cyan-300',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
      text: 'text-cyan-900',
      title: 'text-cyan-800'
    },
  }

  const config = colorConfig[color] || colorConfig.blue

  return (
    <div className={`${config.bg} rounded-xl shadow-lg border-2 ${config.border} p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-semibold ${config.title} mb-2`}>{title}</p>
          <p className={`text-3xl font-bold ${config.text}`}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend > 0 ? (
                <FiTrendingUp className="text-green-600" size={16} />
              ) : (
                <FiTrendingDown className="text-red-600" size={16} />
              )}
              <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl shadow-lg ${config.iconBg} text-white transform group-hover:scale-110 transition-transform`}>
          <Icon size={28} />
        </div>
      </div>
    </div>
  )
}

