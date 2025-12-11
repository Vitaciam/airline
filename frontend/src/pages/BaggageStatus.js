import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { baggageAPI, bookingAPI, paymentAPI } from '../services/api';

function BaggageStatus() {
  const { t } = useTranslation();
  const [baggageTag, setBaggageTag] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [myBaggage, setMyBaggage] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [baggageWeight, setBaggageWeight] = useState('');

  useEffect(() => {
    loadMyBaggage();
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await bookingAPI.getBookings();
      const confirmed = response.data.filter(b => b.status === 'confirmed');
      
      // Проверяем, какие бронирования оплачены
      const bookingsWithPayment = await Promise.all(
        confirmed.map(async (booking) => {
          try {
            const paymentResponse = await paymentAPI.getPaymentByBooking(booking.id);
            return paymentResponse.data && paymentResponse.data.status === 'completed' 
              ? { ...booking, isPaid: true } 
              : null;
          } catch (err) {
            return null; // Если платежа нет, пропускаем
          }
        })
      );
      
      // Фильтруем только оплаченные бронирования
      const paidBookings = bookingsWithPayment.filter(b => b !== null);
      setBookings(paidBookings);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setBookings([]);
    }
  };

  const loadMyBaggage = async () => {
    try {
      const response = await baggageAPI.getMyBaggage();
      setMyBaggage(response.data);
    } catch (err) {
      console.error('Error loading baggage:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!baggageTag) {
      setError(t('baggage.enterTag'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await baggageAPI.getBaggageStatus(baggageTag);
      setStatus(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || t('baggage.noBaggage'));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBaggage = async (e) => {
    e.preventDefault();
    
    if (!selectedBooking || selectedBooking === '') {
      setError(t('bookings.selectBooking'));
      return;
    }

    if (!baggageWeight || parseFloat(baggageWeight) <= 0) {
      setError(t('baggage.enterWeight'));
      return;
    }

    try {
      setError('');
      await baggageAPI.createBaggage({
        booking_id: parseInt(selectedBooking),
        weight: parseFloat(baggageWeight)
      });
      setShowAddForm(false);
      setSelectedBooking('');
      setBaggageWeight('');
      loadMyBaggage();
      loadBookings(); // Обновляем список бронирований
    } catch (err) {
      console.error('Error adding baggage:', err);
      setError(err.response?.data?.detail || t('common.error'));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white py-24 text-black border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-7xl font-black mb-6">{t('baggage.title')}</h1>
          <p className="text-2xl text-gray-600 font-light">{t('baggage.subtitle')}</p>
        </div>
      </div>

      <div className="section-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Form */}
          <div className="card mb-12 max-w-5xl mx-auto bg-gray-50 border-2 border-gray-200">
            <h3 className="text-3xl font-black text-black mb-8">{t('baggage.trackBaggage')}</h3>
            <form onSubmit={handleSearch} className="flex gap-5">
              <input
                type="text"
                value={baggageTag}
                onChange={(e) => setBaggageTag(e.target.value.toUpperCase())}
                placeholder={t('baggage.baggageTag')}
                className="input-field flex-1 text-lg bg-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-primary whitespace-nowrap text-lg px-12 font-black"
              >
                {loading ? t('common.loading') : `🔍 ${t('baggage.trackButton')}`}
              </button>
            </form>

            {status && (
              <div className="mt-10 p-10 bg-white rounded-3xl border-2 border-gray-200 shadow-xl">
                <h4 className="text-3xl font-black text-black mb-8">{t('baggage.status')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">{t('baggage.baggageTag')}</p>
                    <p className="text-4xl font-black text-black">{status.baggage_tag}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">{t('baggage.status')}</p>
                    <span className="inline-block px-6 py-3 bg-black text-white rounded-full text-lg font-black">
                      {t(`baggage.${status.status}`)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">{t('baggage.location')}</p>
                    <p className="text-2xl font-black text-black">{status.location || t('common.notSpecified')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">{t('baggage.booking')}</p>
                    <p className="text-2xl font-black text-black">#{status.booking_id}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* My Baggage */}
          <div className="card bg-gray-50 border-2 border-gray-200">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-black">{t('baggage.myBaggage')}</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn-primary font-black"
              >
                {showAddForm ? t('common.cancel') : t('bookings.addBaggage')}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddBaggage} className="mb-10 p-8 bg-white rounded-2xl border-2 border-gray-100">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <p className="text-red-800 font-semibold">{error}</p>
                  </div>
                )}
                
                {bookings.length === 0 ? (
                  <div className="mb-6 p-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                    <p className="text-yellow-800 font-semibold">
                      {t('baggage.noPaidBookings')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">
                        {t('baggage.booking')}
                      </label>
                      <select
                        value={selectedBooking}
                        onChange={(e) => {
                          setSelectedBooking(e.target.value);
                          setError(''); // Очищаем ошибку при выборе
                        }}
                        className={`input-field bg-white ${error && !selectedBooking ? 'border-red-500' : ''}`}
                        required
                      >
                        <option value="">{t('bookings.selectBooking')}</option>
                        {bookings.map((booking) => (
                          <option key={booking.id} value={booking.id}>
                            #{booking.id} - {booking.flight?.flight_number || 'N/A'} ({booking.seat_number}) - {booking.flight?.origin} → {booking.flight?.destination}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">
                        {t('bookings.baggageWeight')}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={baggageWeight}
                        onChange={(e) => {
                          setBaggageWeight(e.target.value);
                          setError(''); // Очищаем ошибку при вводе
                        }}
                        className={`input-field bg-white ${error && (!baggageWeight || parseFloat(baggageWeight) <= 0) ? 'border-red-500' : ''}`}
                        placeholder="23.5"
                        required
                      />
                    </div>
                  </div>
                )}
                
                {bookings.length > 0 && (
                  <button type="submit" className="mt-6 btn-primary font-black">
                    {t('bookings.addBaggage')}
                  </button>
                )}
              </form>
            )}

            {myBaggage.length === 0 ? (
              <p className="text-gray-600 text-xl py-10 text-center">{t('baggage.noBaggage')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBaggage.map((item) => (
                  <div key={item.id} className="bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-black transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">{t('baggage.baggageTag')}</p>
                        <p className="text-2xl font-black text-black">{item.baggage_tag}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-xs font-bold ${
                        item.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        item.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-black text-white'
                      }`}>
                        {t(`baggage.${item.status}`)}
                      </span>
                    </div>
                    {item.weight && (
                      <p className="text-gray-600 mb-3">
                        <span className="font-bold">{t('baggage.weight')}:</span> {item.weight} kg
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      <span className="font-bold">{t('baggage.location')}:</span> {item.location || t('common.notSpecified')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BaggageStatus;
