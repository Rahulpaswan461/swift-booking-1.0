import axios from 'axios'

// In dev: empty string → proxy handles it via vite.config.js

const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: `${BASE}/api` })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(res => res, err => {
  const isLoginRoute = err.config?.url?.includes('/auth/')
  if (err.response?.status === 401 && !isLoginRoute) {
    localStorage.removeItem('token')
    localStorage.removeItem('otp_email')
    window.location.href = '/'
  }
  return Promise.reject(err)
})

export const doctorApi = axios.create({ baseURL: `${BASE}/api` })
doctorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('doctor_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
doctorApi.interceptors.response.use(res => res, err => {
  const isLoginRoute = err.config?.url?.includes('/doctor/login')
  if (err.response?.status === 401 && !isLoginRoute) {
    localStorage.removeItem('doctor_token')
    localStorage.removeItem('doctor')
    window.location.href = '/doctor/login'
  }
  return Promise.reject(err)
})

export const adminApi = axios.create({ baseURL: `${BASE}/api` })
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
adminApi.interceptors.response.use(res => res, err => {
  const isLoginRoute = err.config?.url?.includes('/admin/login')
  if (err.response?.status === 401 && !isLoginRoute) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin')
    window.location.href = '/admin/login'
  }
  return Promise.reject(err)
})

export default api