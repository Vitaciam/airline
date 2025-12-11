import axios from 'axios';

// Получаем URL сервисов из переменных окружения
const AUTH_SERVICE = process.env.REACT_APP_AUTH_SERVICE || 'http://localhost:8001';
const BOOKING_SERVICE = process.env.REACT_APP_BOOKING_SERVICE || 'http://localhost:8002';
const BAGGAGE_SERVICE = process.env.REACT_APP_BAGGAGE_SERVICE || 'http://localhost:8003';
const ADMIN_SERVICE = process.env.REACT_APP_ADMIN_SERVICE || 'http://localhost:8004';
const PAYMENT_SERVICE = process.env.REACT_APP_PAYMENT_SERVICE || 'http://localhost:8006';

// Логируем для отладки (удалить в продакшене)
console.log('API URLs:', {
  AUTH_SERVICE,
  BOOKING_SERVICE,
  BAGGAGE_SERVICE,
  ADMIN_SERVICE
});

const api = axios.create();

// Auth API
export const authAPI = {
  login: (email, password) => axios.post(`${AUTH_SERVICE}/login`, { email, password }),
  register: (data) => axios.post(`${AUTH_SERVICE}/register`, data),
  me: () => api.get(`${AUTH_SERVICE}/me`),
  updateProfile: (data) => api.put(`${AUTH_SERVICE}/profile`, data),
};

// Booking API
export const bookingAPI = {
  getFlights: (params) => api.get(`${BOOKING_SERVICE}/flights`, { params }),
  getFlight: (id) => api.get(`${BOOKING_SERVICE}/flights/${id}`),
  getBookedSeats: (flightId) => api.get(`${BOOKING_SERVICE}/flights/${flightId}/booked-seats`),
  createBooking: (data) => api.post(`${BOOKING_SERVICE}/bookings`, data),
  getBookings: () => api.get(`${BOOKING_SERVICE}/bookings`),
  getBooking: (id) => api.get(`${BOOKING_SERVICE}/bookings/${id}`),
  cancelBooking: (id) => api.delete(`${BOOKING_SERVICE}/bookings/${id}`),
};

// Baggage API
export const baggageAPI = {
  createBaggage: (data) => api.post(`${BAGGAGE_SERVICE}/baggage`, data),
  getBaggageStatus: (tag) => api.get(`${BAGGAGE_SERVICE}/baggage/status/${tag}`),
  getBaggageByBooking: (bookingId) => api.get(`${BAGGAGE_SERVICE}/baggage/booking/${bookingId}`),
  getMyBaggage: () => api.get(`${BAGGAGE_SERVICE}/baggage/my`),
};

// Admin API
export const adminAPI = {
  createAirline: (data) => api.post(`${ADMIN_SERVICE}/airlines`, data),
  getAirlines: () => api.get(`${ADMIN_SERVICE}/airlines`),
  updateAirline: (id, data) => api.put(`${ADMIN_SERVICE}/airlines/${id}`, data),
  deleteAirline: (id) => api.delete(`${ADMIN_SERVICE}/airlines/${id}`),
  createFlight: (data) => api.post(`${ADMIN_SERVICE}/flights`, data),
  getFlights: () => api.get(`${ADMIN_SERVICE}/flights`),
  deleteFlight: (id) => api.delete(`${ADMIN_SERVICE}/flights/${id}`),
  getStatistics: () => api.get(`${ADMIN_SERVICE}/statistics`),
  getClients: () => api.get(`${ADMIN_SERVICE}/clients`),
  updateClient: (id, data) => api.put(`${ADMIN_SERVICE}/clients/${id}`, data),
  getBookings: () => api.get(`${ADMIN_SERVICE}/bookings`),
  updateBooking: (id, data) => api.put(`${ADMIN_SERVICE}/bookings/${id}`, data),
};

// Payment API
export const paymentAPI = {
  createPayment: (data) => api.post(`${PAYMENT_SERVICE}/payments`, data),
  getPayments: () => api.get(`${PAYMENT_SERVICE}/payments`),
  getPayment: (paymentId) => api.get(`${PAYMENT_SERVICE}/payments/${paymentId}`),
  getPaymentByBooking: (bookingId) => api.get(`${PAYMENT_SERVICE}/payments/booking/${bookingId}`),
  getReceipt: (paymentId) => api.get(`${PAYMENT_SERVICE}/payments/${paymentId}/receipt`),
  refundPayment: (paymentId, data) => api.post(`${PAYMENT_SERVICE}/payments/${paymentId}/refund`, data),
};

// Set auth token interceptor for requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Request with token:', config.url, 'Token:', token.substring(0, 20) + '...');
  } else {
    console.warn('No token found for request:', config.url);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      console.warn('Unauthorized access - token invalid or expired');
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      
      // Не делаем автоматический редирект - пусть компоненты сами обрабатывают
      // Это позволяет показать пользователю сообщение об ошибке перед редиректом
    }
    return Promise.reject(error);
  }
);

export default api;

