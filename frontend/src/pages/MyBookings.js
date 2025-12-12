import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { bookingAPI, paymentAPI } from '../services/api';

function MyBookings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBookings();
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingAPI.getBookings();
      setBookings(response.data);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await paymentAPI.getPayments();
      const paymentsMap = {};
      response.data.forEach(payment => {
        if (payment.status === 'completed') {
          paymentsMap[payment.booking_id] = payment;
        }
      });
      setPayments(paymentsMap);
    } catch (err) {
      console.error('Error loading payments:', err);
    }
  };

  const handleViewReceipt = (bookingId) => {
    const payment = payments[bookingId];
    if (payment) {
      navigate(`/receipt/${payment.payment_id}`);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm(t('bookings.confirmCancel'))) {
      return;
    }

    try {
      await bookingAPI.cancelBooking(bookingId);
      setSuccess(t('bookings.cancelled'));
      loadBookings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setSuccess(err.response?.data?.detail || t('common.error'));
      setTimeout(() => setSuccess(''), 3000);
    }
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
    <div className="min-h-screen bg-white">
      <div className="bg-white py-24 text-black border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-7xl font-black mb-6">{t('bookings.title')}</h1>
          <p className="text-2xl text-gray-600 font-light">{t('bookings.subtitle')}</p>
        </div>
      </div>
      
      <div className="section-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

          {loading ? (
            <div className="text-center py-32">
              <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-black"></div>
              <p className="mt-8 text-gray-600 text-xl font-semibold">{t('common.loading')}</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="card text-center py-24 max-w-2xl mx-auto">
              <div className="inline-block bg-gray-100 p-8 rounded-full mb-8">
                <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-4xl font-black text-black mb-5">{t('bookings.noBookings')}</h3>
              <p className="text-gray-600 mb-10 text-xl">{t('flights.bookNow')}</p>
              <Link to="/flights" className="btn-primary inline-block text-lg px-12 py-5 font-black">
                {t('flights.searchFlights')}
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {bookings.map((booking) => (
                <div key={booking.id} className="card bg-white border-2 border-gray-100 hover:border-black transition-all">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-5 mb-6">
                        <div className="bg-black text-white px-6 py-3 rounded-full">
                          <span className="text-2xl font-black">{booking.flight?.flight_number || 'N/A'}</span>
                        </div>
                        <span className={`px-5 py-2 rounded-full text-sm font-bold ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {booking.status === 'confirmed' ? t('bookings.confirmed') : t('bookings.cancelled')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">{t('flights.from')}</p>
                          <p className="text-2xl font-black text-black">{booking.flight?.origin || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">{t('flights.to')}</p>
                          <p className="text-2xl font-black text-black">{booking.flight?.destination || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">{t('bookings.seat')}</p>
                          <p className="text-2xl font-black text-black">{booking.seat_number}</p>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-600">
                        <div>
                          <span className="font-bold">{t('flights.departure')}:</span> {booking.flight?.departure_time ? formatDate(booking.flight.departure_time) : 'N/A'}
                        </div>
                        <div>
                          <span className="font-bold">{t('bookings.bookingDate')}:</span> {formatDate(booking.booking_date)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      {booking.status === 'confirmed' && (
                        <>
                          {payments[booking.id] && (
                            <button
                              onClick={() => handleViewReceipt(booking.id)}
                              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-full transition-colors shadow-lg hover:shadow-xl whitespace-nowrap"
                            >
                              {t('bookings.viewReceipt')}
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-full transition-colors shadow-lg hover:shadow-xl whitespace-nowrap"
                          >
                            {t('bookings.cancelBooking')}
                          </button>
                          <Link
                            to="/baggage"
                            className="px-8 py-4 bg-black hover:bg-gray-800 text-white font-black rounded-full transition-colors shadow-lg hover:shadow-xl text-center whitespace-nowrap"
                          >
                            {t('bookings.addBaggage')}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyBookings;
