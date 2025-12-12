import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingAPI, paymentAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

function Flights() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [selectedSeat, setSelectedSeat] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);
  const [bookingFlightPrice, setBookingFlightPrice] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: ''
  });

  useEffect(() => {
    loadFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFlights = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (searchOrigin && searchOrigin.trim()) {
        params.origin = searchOrigin.trim();
      }
      if (searchDestination && searchDestination.trim()) {
        params.destination = searchDestination.trim();
      }
      if (searchDate && searchDate.trim()) {
        params.departure_date = searchDate.trim();
      }
      
      console.log('Loading flights with params:', params);
      const response = await bookingAPI.getFlights(params);
      console.log('Flights response:', response.data);
      setFlights(response.data || []);
      
      if (response.data && response.data.length === 0 && (params.origin || params.destination)) {
        setError(t('flights.noFlightsFound') || 'Рейсы не найдены. Попробуйте изменить параметры поиска.');
      }
    } catch (err) {
      console.error('Error loading flights:', err);
      setError(err.response?.data?.detail || t('common.error') || 'Ошибка при загрузке рейсов');
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadFlights();
  };

  const loadBookedSeats = async (flightId) => {
    try {
      setLoadingSeats(true);
      const response = await bookingAPI.getBookedSeats(flightId);
      setBookedSeats(response.data.booked_seats || []);
    } catch (err) {
      console.error('Error loading booked seats:', err);
      setBookedSeats([]);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleSelectFlight = (flight) => {
    setSelectedFlight(flight);
    setSelectedSeat('');
    loadBookedSeats(flight.id);
  };

  const handleBook = async (flight) => {
    if (!selectedSeat) {
      setError(t('flights.selectSeat'));
      return;
    }

    if (!flight || !flight.id) {
      console.error('Invalid flight:', flight);
      setError(t('flights.bookingError'));
      return;
    }

    // Проверяем токен перед запросом
    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('common.loginRequired'));
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    
    // Проверяем, что токен не пустой
    if (token.trim() === '') {
      setError(t('common.loginRequired'));
      localStorage.removeItem('token');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      setBookingLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      console.log('=== Booking Request ===');
      console.log('Flight ID:', flight.id);
      console.log('Seat:', selectedSeat);
      console.log('Token exists:', !!token);
      console.log('Token length:', token ? token.length : 0);
      console.log('Token preview:', token ? token.substring(0, 30) + '...' : 'N/A');
      
      // Проверяем, что токен валидный перед запросом
      if (!token || token.trim() === '') {
        throw new Error('Token not found. Please log in again.');
      }
      
      const bookingResponse = await bookingAPI.createBooking({
        flight_id: flight.id,
        seat_number: selectedSeat
      });
      
      console.log('✅ Booking created successfully:', bookingResponse.data);
      const booking = bookingResponse.data;
      setCreatedBooking(booking);
      setBookingFlightPrice(flight.price); // Сохраняем цену рейса
      setSelectedFlight(null);
      setSelectedSeat('');
      setBookedSeats([]);
      setShowPayment(true);
      loadFlights();
    } catch (err) {
      console.error('❌ Booking error:', err);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      console.error('Error message:', err.message);
      
      const errorMessage = err.response?.data?.detail || err.message || t('flights.bookingError');
      setError(errorMessage);
      
      // Если токен недействителен, показываем понятное сообщение
      if (err.response?.status === 401 || errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('unauthorized')) {
        console.warn('⚠️ Token invalid. User should log in again.');
        setError('Токен недействителен. Пожалуйста, выйдите и войдите заново.');
        // Предлагаем перелогиниться через 3 секунды
        setTimeout(() => {
          if (window.confirm('Ваш токен истек или недействителен. Перейти на страницу входа?')) {
            localStorage.removeItem('token');
            navigate('/login');
          }
        }, 3000);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const validateCard = () => {
    // Простая валидация для учебных целей
    if (!paymentForm.cardNumber || paymentForm.cardNumber.replace(/\s/g, '').length < 16) {
      return t('payment.invalidCardNumber');
    }
    if (!paymentForm.cardHolder || paymentForm.cardHolder.length < 3) {
      return t('payment.invalidCardHolder');
    }
    if (!paymentForm.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentForm.expiryDate)) {
      return t('payment.invalidExpiryDate');
    }
    if (!paymentForm.cvv || paymentForm.cvv.length !== 3) {
      return t('payment.invalidCVV');
    }
    return null;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!createdBooking) return;

    // Валидация карты
    const validationError = validateCard();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setPaymentLoading(true);
      setError('');
      
      // Для учебных целей просто симулируем задержку обработки
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await paymentAPI.createPayment({
        booking_id: createdBooking.id,
        amount: bookingFlightPrice || 0,
        payment_method: 'card',
        currency: 'MDL'
      });
      
      setSuccess(t('payment.paymentSuccess'));
      setShowPayment(false);
      setCreatedBooking(null);
      setBookingFlightPrice(0);
      setPaymentForm({ cardNumber: '', cardHolder: '', expiryDate: '', cvv: '' });
      
      setTimeout(() => {
        setSuccess('');
        navigate('/bookings');
      }, 2000);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.detail || t('payment.paymentError'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    // Форматирование номера карты: 1234 5678 9012 3456
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    // Форматирование даты: MM/YY
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const generateSeatNumbers = (totalSeats) => {
    const seats = [];
    const rows = Math.ceil(totalSeats / 6);
    for (let row = 1; row <= rows; row++) {
      for (let col of ['A', 'B', 'C', 'D', 'E', 'F']) {
        if (seats.length < totalSeats) {
          seats.push(`${row}${col}`);
        }
      }
    }
    return seats;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <div className="py-12" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Form */}
          <div className="mb-16 max-w-5xl mx-auto rounded-3xl shadow-2xl p-10 border-2 border-gray-100" style={{ backgroundColor: '#ffffff' }}>
            <h2 className="text-4xl md:text-5xl font-black mb-10 text-center text-gray-900">{t('flights.searchFlights')}</h2>
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-black mb-4 uppercase tracking-wide">{t('flights.from')}</label>
                <input
                  type="text"
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                  placeholder={t('flights.fromPlaceholder')}
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-4 uppercase tracking-wide">{t('flights.to')}</label>
                <input
                  type="text"
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  placeholder={t('flights.toPlaceholder')}
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-4 uppercase tracking-wide">{t('flights.departureDate') || 'Дата вылета'}</label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field bg-white"
                />
              </div>
              <div className="md:col-span-3 flex justify-center">
                <button 
                  type="submit" 
                  className="text-lg px-12 py-5 font-black rounded-full transition-all transform hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                          color: '#ffffff',
                          boxShadow: '0 20px 40px -12px rgba(59, 130, 246, 0.4)',
                        }}
                >
                  {t('home.searchButton')}
                </button>
              </div>
            </form>
          </div>

          {/* Alerts */}
          {success && (
            <div className="mb-10 max-w-4xl mx-auto p-6 bg-green-50 border-l-4 border-green-500 rounded-2xl shadow-lg">
              <div className="flex items-center">
                <svg className="w-7 h-7 text-green-500 mr-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-900 font-bold text-xl">{success}</p>
              </div>
            </div>
          )}

          {/* Flights Grid */}
          {loading ? (
            <div className="text-center py-32">
              <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-black"></div>
              <p className="mt-8 text-gray-600 text-xl font-semibold">{t('common.loading')}</p>
            </div>
          ) : flights.length === 0 ? (
            <div className="text-center py-32">
              <div className="inline-block bg-gray-100 p-8 rounded-full mb-8">
                <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-4xl font-black text-black mb-5">{t('flights.noFlights')}</h3>
              <p className="text-gray-600 mb-10 text-xl">{t('common.search')}</p>
              <button onClick={() => {setSearchOrigin(''); setSearchDestination(''); loadFlights();}} className="btn-primary text-lg px-12 py-5">
                {t('flights.searchFlights')}
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-5xl md:text-6xl font-black mb-16 text-center text-gray-900">{t('flights.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {flights.map((flight) => (
                  <div
                    key={flight.id}
                    className="bg-white rounded-3xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 border-transparent hover:border-indigo-200 overflow-hidden"
                  >
                    <div className="mb-8 pb-6 border-b-2 border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-3xl font-black text-indigo-600">{flight.flight_number}</h3>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">
                        {t('flights.airline')}
                      </p>
                    </div>

                    <div className="space-y-6 mb-8 pb-8 border-b-2 border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">{t('flights.from')}</p>
                          <p className="text-2xl font-black text-black">{flight.origin}</p>
                          <p className="text-sm text-gray-600 mt-2 font-medium">{formatDate(flight.departure_time)}</p>
                        </div>
                        <div className="mx-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">{t('flights.to')}</p>
                          <p className="text-2xl font-black text-black">{flight.destination}</p>
                          <p className="text-sm text-gray-600 mt-2 font-medium">{formatDate(flight.arrival_time)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <p className="text-4xl font-black text-indigo-600 mb-2">
                        {flight.price} {t('common.currency')}
                      </p>
                      <p className="text-sm text-gray-500 font-medium">
                        {t('flights.availableSeats')}: <span className="font-bold text-indigo-600">{flight.available_seats}</span>
                      </p>
                    </div>

                    {flight.available_seats > 0 && (
                      <button
                        onClick={() => handleSelectFlight(flight)}
                        className="w-full text-lg py-5 font-black rounded-full transition-all transform hover:scale-105 hover:shadow-xl"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                          color: '#ffffff',
                          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                        }}
                      >
                        {t('flights.bookNow')}
                      </button>
                    )}
                    {flight.available_seats === 0 && (
                      <button disabled className="w-full bg-gray-200 text-gray-500 font-bold py-5 px-6 rounded-full cursor-not-allowed text-lg">
                        {t('flights.noFlights')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && createdBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full">
            <div className="p-10 border-b-2 border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-4xl font-black text-black">{t('payment.title')}</h3>
                  <p className="text-gray-600 mt-3 text-lg font-semibold">{t('bookings.booking')} №{createdBooking.id}</p>
                </div>
                <button
                  onClick={() => {
                    setShowPayment(false);
                    setCreatedBooking(null);
                    setBookingFlightPrice(0);
                  }}
                  className="text-gray-500 hover:text-black text-4xl w-12 h-12 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors font-light"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-10">
              <div className="bg-gray-50 p-8 rounded-3xl mb-8 border-2 border-gray-200">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">{t('payment.amount')}:</span>
                    <span className="text-3xl font-black text-black">{bookingFlightPrice || 0} {t('common.currency')}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <p className="text-red-800 font-semibold">{error}</p>
                </div>
              )}

              <form onSubmit={handlePayment} className="space-y-6">
                <div>
                  <label className="block text-sm font-black text-black mb-3 uppercase tracking-wide">
                    {t('payment.cardNumber')}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.cardNumber}
                    onChange={(e) => setPaymentForm({...paymentForm, cardNumber: formatCardNumber(e.target.value)})}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    className="input-field bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-black mb-3 uppercase tracking-wide">
                    {t('payment.cardHolder')}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.cardHolder}
                    onChange={(e) => setPaymentForm({...paymentForm, cardHolder: e.target.value.toUpperCase()})}
                    placeholder="IVAN IVANOV"
                    className="input-field bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-black mb-3 uppercase tracking-wide">
                      {t('payment.expiryDate')}
                    </label>
                    <input
                      type="text"
                      value={paymentForm.expiryDate}
                      onChange={(e) => setPaymentForm({...paymentForm, expiryDate: formatExpiryDate(e.target.value)})}
                      placeholder="MM/YY"
                      maxLength="5"
                      className="input-field bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-black mb-3 uppercase tracking-wide">
                      {t('payment.cvv')}
                    </label>
                    <input
                      type="text"
                      value={paymentForm.cvv}
                      onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value.replace(/\D/g, '').substring(0, 3)})}
                      placeholder="123"
                      maxLength="3"
                      className="input-field bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <p className="text-blue-800 text-sm font-semibold">
                    💡 {t('payment.demoNote')}
                  </p>
                </div>
              
                <div className="flex space-x-5">
                  <button
                    type="submit"
                    disabled={paymentLoading}
                    className="flex-1 btn-primary text-lg py-6 font-black disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? t('common.loading') : t('bookings.payNow')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPayment(false);
                      setCreatedBooking(null);
                      setBookingFlightPrice(0);
                      setPaymentForm({ cardNumber: '', cardHolder: '', expiryDate: '', cvv: '' });
                      navigate('/bookings');
                    }}
                    className="px-10 py-6 bg-white hover:bg-gray-50 text-black font-bold rounded-full border-2 border-black transition-colors text-lg shadow-lg"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Seat Selection Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-10 border-b-2 border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-4xl font-black text-black">{t('flights.selectSeat')}</h3>
                  <p className="text-gray-600 mt-3 text-lg font-semibold">{selectedFlight.flight_number} - {selectedFlight.origin} → {selectedFlight.destination}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFlight(null);
                    setSelectedSeat('');
                    setBookedSeats([]);
                  }}
                  className="text-gray-500 hover:text-black text-4xl w-12 h-12 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors font-light"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-10">
              <div className="bg-gray-50 p-8 rounded-3xl mb-8 border-2 border-gray-200">
                <div className="flex justify-center items-center space-x-8 mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-400 rounded-xl shadow-md"></div>
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('flights.availableSeats')}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-400 rounded-xl shadow-md"></div>
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('bookings.cancelled')}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-black rounded-xl shadow-md"></div>
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('bookings.confirmed')}</span>
                  </div>
                </div>
                {loadingSeats ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-black"></div>
                    <p className="mt-4 text-gray-600 font-semibold">{t('common.loading')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-4">
                    {generateSeatNumbers(selectedFlight.total_seats).map((seat) => {
                      const isBooked = bookedSeats.includes(seat);
                      return (
                        <button
                          key={seat}
                          onClick={() => !isBooked && setSelectedSeat(seat)}
                          disabled={isBooked}
                          className={`py-4 px-4 rounded-xl font-black text-sm transition-all ${
                            selectedSeat === seat
                              ? 'bg-black text-white transform scale-110 shadow-xl'
                              : isBooked
                              ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                              : 'bg-green-400 text-white hover:bg-green-500 hover:scale-105 shadow-lg'
                          }`}
                        >
                          {seat}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <p className="text-red-800 font-semibold">{error}</p>
                </div>
              )}
              
              <div className="flex space-x-5">
                <button
                  onClick={() => {
                    console.log('Confirm button clicked', { selectedFlight, selectedSeat });
                    if (selectedFlight) {
                      handleBook(selectedFlight);
                    } else {
                      setError('Рейс не выбран');
                    }
                  }}
                  disabled={!selectedSeat || bookingLoading}
                  className="flex-1 btn-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-lg py-6 font-black"
                >
                  {bookingLoading ? t('common.loading') : t('flights.confirmBooking')}
                </button>
                <button
                  onClick={() => {
                    setSelectedFlight(null);
                    setSelectedSeat('');
                    setBookedSeats([]);
                  }}
                  className="px-10 py-6 bg-white hover:bg-gray-50 text-black font-bold rounded-full border-2 border-black transition-colors text-lg shadow-lg"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Flights;
