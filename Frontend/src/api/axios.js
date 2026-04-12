import axios from 'axios'

// Patient API — uses patient JWT
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('otp_email')
    window.location.href = '/'
  }
  return Promise.reject(err)
})

// Doctor API — uses doctor JWT
export const doctorApi = axios.create({ baseURL: '/api' })
doctorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('doctor_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
doctorApi.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('doctor_token')
    localStorage.removeItem('doctor')
    window.location.href = '/doctor/login'
  }
  return Promise.reject(err)
})

// Admin API — uses admin JWT
export const adminApi = axios.create({ baseURL: '/api' })
adminApi.interceptors.request.use((config) => {
  console.log("config: ", config)
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
adminApi.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin')
    window.location.href = '/admin/login'
  }
  return Promise.reject(err)
})

export default api
