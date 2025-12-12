import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authAPI, bookingAPI, baggageAPI } from '../services/api';

function Profile() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [baggage, setBaggage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userResponse = await authAPI.me();
      const userData = userResponse.data;
      setUser(userData);
      setFormData({
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || '',
        email: userData.email
      });

      // Load bookings
      try {
        const bookingsResponse = await bookingAPI.getBookings();
        setBookings(bookingsResponse.data);
      } catch (err) {
        console.error('Error loading bookings:', err);
      }

      // Load baggage
      try {
        const baggageResponse = await baggageAPI.getMyBaggage();
        setBaggage(baggageResponse.data);
      } catch (err) {
        console.error('Error loading baggage:', err);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await authAPI.updateProfile(formData);
      const updatedUser = response.data.user || response.data;
      setUser(updatedUser);
      
      // Update token if provided
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
      }
      
      setEditing(false);
      setSuccess(t('profile.profileUpdated'));
      setTimeout(() => setSuccess(''), 3000);
      
      // Reload page to update navbar
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setSuccess(err.response?.data?.detail || t('common.error'));
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const formatDate = (dateString) => {
    const localeMap = {
      'ru': 'ru-RU',
      'ro': 'ro-RO',
      'en': 'en-US'
    };
    const locale = localeMap[i18n.language] || 'en-US';
    return new Date(dateString).toLocaleString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-black"></div>
          <p className="mt-8 text-gray-600 text-xl font-semibold">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white py-24 text-black border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-7xl font-black mb-6">{t('profile.title')}</h1>
          <p className="text-2xl text-gray-600 font-light">{t('profile.subtitle')}</p>
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

          {/* Profile Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
            <div className="lg:col-span-2">
              <div className="card bg-gray-50 border-2 border-gray-200">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black text-black">{t('profile.personalData')}</h2>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="btn-primary font-black"
                    >
                      {t('common.edit')}
                    </button>
                  )}
                </div>

                {!editing ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">{t('profile.firstName')}</p>
                      <p className="text-2xl font-black text-black">{user?.first_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">{t('profile.lastName')}</p>
                      <p className="text-2xl font-black text-black">{user?.last_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">{t('profile.email')}</p>
                      <p className="text-2xl font-black text-black">{user?.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">{t('profile.phone')}</p>
                      <p className="text-2xl font-black text-black">{user?.phone || t('profile.notProvided')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">{t('profile.registrationDate')}</p>
                      <p className="text-lg font-semibold text-gray-700">{user?.created_at ? formatDate(user.created_at) : '-'}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('profile.firstName')}</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('profile.lastName')}</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('profile.phone')}</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-field bg-white"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button type="submit" className="btn-primary font-black">
                        {t('profile.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setFormData({
                            first_name: user?.first_name || '',
                            last_name: user?.last_name || '',
                            phone: user?.phone || '',
                            email: user?.email || ''
                          });
                        }}
                        className="px-8 py-4 bg-white hover:bg-gray-50 text-black font-bold rounded-full border-2 border-black transition-colors"
                      >
                        {t('profile.cancel')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="card bg-black text-white border-none">
                <div className="text-center">
                  <div className="bg-white bg-opacity-20 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <p className="text-4xl font-black mb-2">{bookings.length}</p>
                  <p className="text-gray-300 uppercase tracking-wide text-sm">{t('profile.bookings')}</p>
                </div>
              </div>

              <div className="card bg-black text-white border-none">
                <div className="text-center">
                  <div className="bg-white bg-opacity-20 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                    </svg>
                  </div>
                  <p className="text-4xl font-black mb-2">{baggage.length}</p>
                  <p className="text-gray-300 uppercase tracking-wide text-sm">{t('profile.baggageUnits')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="card bg-gray-50 border-2 border-gray-200 mb-12">
            <h2 className="text-3xl font-black text-black mb-8">{t('profile.recentBookings')}</h2>
            {bookings.length === 0 ? (
              <p className="text-gray-600 text-lg">{t('profile.noBookings')}</p>
            ) : (
              <div className="space-y-6">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="bg-white p-6 rounded-2xl border-2 border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-black text-black mb-2">
                          {booking.flight?.flight_number || t('profile.flight')}
                        </h3>
                        <p className="text-gray-600 mb-1">
                          {booking.flight?.origin} → {booking.flight?.destination}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t('profile.seat')}: {booking.seat_number} • {formatDate(booking.booking_date)}
                        </p>
                      </div>
                      <span className={`px-5 py-2 rounded-full text-sm font-bold ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.status === 'confirmed' ? t('profile.confirmed') : t('profile.cancelled')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {bookings.length > 5 && (
              <div className="mt-6 text-center">
                <a href="/bookings" className="text-black hover:text-gray-800 font-bold underline text-lg">
                  {t('profile.viewAllBookings')}
                </a>
              </div>
            )}
          </div>

          {/* Baggage Status */}
          <div className="card bg-gray-50 border-2 border-gray-200">
            <h2 className="text-3xl font-black text-black mb-8">{t('profile.baggageStatus')}</h2>
            {baggage.length === 0 ? (
              <p className="text-gray-600 text-lg">{t('profile.noBaggage')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {baggage.slice(0, 4).map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-2xl border-2 border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">{t('profile.baggageTag')}</p>
                        <p className="text-xl font-black text-black">{item.baggage_tag}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-xs font-bold ${
                        item.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        item.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-black text-white'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {item.location || t('profile.locationNotSpecified')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {baggage.length > 4 && (
              <div className="mt-6 text-center">
                <a href="/baggage" className="text-black hover:text-gray-800 font-bold underline text-lg">
                  {t('profile.viewAllBaggage')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

