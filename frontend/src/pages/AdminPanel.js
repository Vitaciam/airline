import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { adminAPI } from '../services/api';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';

function AdminPanel() {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('statistics');
  const [statistics, setStatistics] = useState(null);
  const [airlines, setAirlines] = useState([]);
  const [flights, setFlights] = useState([]);
  const [clients, setClients] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Toast state
  const [toast, setToast] = useState(null);
  
  // Modal state
  const [modal, setModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState({ airlines: 1, flights: 1, clients: 1, bookings: 1 });
  const itemsPerPage = 10;
  
  // Search states
  const [searchQuery, setSearchQuery] = useState({ airlines: '', flights: '', clients: '', bookings: '' });

  const [airlineForm, setAirlineForm] = useState({
    name: '',
    code: '',
    country: ''
  });
  const [editingAirline, setEditingAirline] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [flightForm, setFlightForm] = useState({
    airline_id: '',
    flight_number: '',
    origin: '',
    destination: '',
    departure_time: '',
    arrival_time: '',
    total_seats: '',
    price: ''
  });

  // Sync with URL hash on mount and when hash changes
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    if (hash) {
      const tab = hash.substring(1);
      if (['statistics', 'airlines', 'flights', 'clients', 'bookings'].includes(tab)) {
        setActiveTab(tab);
        // Reset pagination when switching tabs
        setCurrentPage({ airlines: 1, flights: 1, clients: 1, bookings: 1 });
        setSearchQuery({ airlines: '', flights: '', clients: '', bookings: '' });
      }
    }
  }, [location.hash]);

  // Listen for hash changes from Navbar
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const tab = window.location.hash.substring(1);
        if (['statistics', 'airlines', 'flights', 'clients', 'bookings'].includes(tab)) {
          setActiveTab(tab);
          // Reset pagination when switching tabs
          setCurrentPage({ airlines: 1, flights: 1, clients: 1, bookings: 1 });
          setSearchQuery({ airlines: '', flights: '', clients: '', bookings: '' });
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (activeTab === 'statistics') {
      loadStatistics();
    } else if (activeTab === 'airlines') {
      loadAirlines();
    } else if (activeTab === 'flights') {
      loadFlights();
    } else if (activeTab === 'clients') {
      loadClients();
    } else if (activeTab === 'bookings') {
      loadBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getStatistics();
      setStatistics(response.data);
    } catch (err) {
      setError(t('admin.errorStatistics'));
    } finally {
      setLoading(false);
    }
  };

  const loadAirlines = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getAirlines();
      setAirlines(response.data);
    } catch (err) {
      setError(t('admin.errorAirlines'));
    } finally {
      setLoading(false);
    }
  };

  const loadFlights = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getFlights();
      setFlights(response.data);
      if (airlines.length === 0) {
        await loadAirlines();
      }
    } catch (err) {
      setError(t('admin.errorFlights'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAirline = async (e) => {
    e.preventDefault();
    
    // Валидация
    if (!airlineForm.name || !airlineForm.code) {
      showToast(t('admin.fillRequiredFields'), 'error');
      return;
    }

    try {
      setError('');
      setLoading(true);
      console.log('Creating airline:', airlineForm);
      
      const response = await adminAPI.createAirline(airlineForm);
      console.log('Airline created:', response.data);
      
      showToast(t('admin.airlineCreated'), 'success');
      setAirlineForm({ name: '', code: '', country: '' });
      setEditingAirline(null);
      await loadAirlines();
    } catch (err) {
      console.error('Error creating airline:', err);
      const errorMessage = err.response?.data?.detail || err.message || t('admin.errorCreateAirline');
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAirline = (airline) => {
    setEditingAirline(airline);
    setAirlineForm({
      name: airline.name,
      code: airline.code,
      country: airline.country || ''
    });
  };

  const handleUpdateAirline = async (e) => {
    e.preventDefault();
    
    if (!editingAirline) return;
    
    try {
      setError('');
      setLoading(true);
      
      await adminAPI.updateAirline(editingAirline.id, airlineForm);
      
      showToast(t('admin.airlineUpdated'), 'success');
      setAirlineForm({ name: '', code: '', country: '' });
      setEditingAirline(null);
      await loadAirlines();
    } catch (err) {
      console.error('Error updating airline:', err);
      const errorMessage = err.response?.data?.detail || err.message || t('admin.errorUpdateAirline');
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const showConfirmModal = (title, message, onConfirm) => {
    setModal({ isOpen: true, title, message, onConfirm });
  };

  const handleDeleteAirline = async (airlineId) => {
    showConfirmModal(
      t('admin.confirmDeleteAirline'),
      t('admin.confirmDeleteAirlineMessage') || 'Это действие нельзя отменить.',
      async () => {
        try {
          setLoading(true);
          await adminAPI.deleteAirline(airlineId);
          showToast(t('admin.airlineDeleted'), 'success');
          await loadAirlines();
        } catch (err) {
          const errorMessage = err.response?.data?.detail || err.message || t('admin.errorDeleteAirline');
          showToast(errorMessage, 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setClientForm({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      email: client.email || '',
      phone: client.phone || ''
    });
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      setError('');
      setLoading(true);
      
      await adminAPI.updateClient(editingClient.id, clientForm);
      
      showToast(t('admin.clientUpdated'), 'success');
      setEditingClient(null);
      setClientForm({ first_name: '', last_name: '', email: '', phone: '' });
      await loadClients();
    } catch (err) {
      console.error('Error updating client:', err);
      const errorMessage = err.response?.data?.detail || err.message || t('admin.errorUpdateClient');
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter and pagination helpers
  const filterData = (data, searchQuery, searchFields) => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(query);
      })
    );
  };

  const getPaginatedData = (data, page, perPage) => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return data.slice(start, end);
  };

  const getTotalPages = (data, perPage) => {
    return Math.max(1, Math.ceil(data.length / perPage));
  };

  // Filtered and paginated data
  const filteredAirlines = filterData(airlines, searchQuery.airlines, ['name', 'code', 'country']);
  const paginatedAirlines = getPaginatedData(filteredAirlines, currentPage.airlines, itemsPerPage);
  const totalAirlinesPages = getTotalPages(filteredAirlines, itemsPerPage);

  const filteredFlights = filterData(flights, searchQuery.flights, ['flight_number', 'origin', 'destination']);
  const paginatedFlights = getPaginatedData(filteredFlights, currentPage.flights, itemsPerPage);
  const totalFlightsPages = getTotalPages(filteredFlights, itemsPerPage);

  const filteredClients = filterData(clients, searchQuery.clients, ['first_name', 'last_name', 'email', 'phone']);
  const paginatedClients = getPaginatedData(filteredClients, currentPage.clients, itemsPerPage);
  const totalClientsPages = getTotalPages(filteredClients, itemsPerPage);

  const filteredBookings = filterData(allBookings, searchQuery.bookings, ['flight_number', 'user_name', 'user_email', 'seat_number']);
  const paginatedBookings = getPaginatedData(filteredBookings, currentPage.bookings, itemsPerPage);
  const totalBookingsPages = getTotalPages(filteredBookings, itemsPerPage);

  const handleCreateFlight = async (e) => {
    e.preventDefault();
    try {
      const flightData = {
        ...flightForm,
        airline_id: parseInt(flightForm.airline_id),
        total_seats: parseInt(flightForm.total_seats),
        price: parseFloat(flightForm.price),
        departure_time: new Date(flightForm.departure_time).toISOString(),
        arrival_time: new Date(flightForm.arrival_time).toISOString()
      };
      await adminAPI.createFlight(flightData);
      showToast(t('admin.flightCreated'), 'success');
      setFlightForm({
        airline_id: '',
        flight_number: '',
        origin: '',
        destination: '',
        departure_time: '',
        arrival_time: '',
        total_seats: '',
        price: ''
      });
      loadFlights();
    } catch (err) {
      showToast(err.response?.data?.detail || t('admin.errorCreateFlight'), 'error');
    }
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getClients();
      setClients(response.data);
    } catch (err) {
      setError(t('admin.errorClients'));
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getBookings();
      setAllBookings(response.data);
    } catch (err) {
      setError(t('admin.errorBookings'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBooking = async (bookingId, newStatus) => {
    try {
      setError('');
      await adminAPI.updateBooking(bookingId, { status: newStatus });
      showToast(t('admin.bookingUpdated'), 'success');
      loadBookings();
    } catch (err) {
      showToast(err.response?.data?.detail || t('admin.errorUpdateBooking'), 'error');
    }
  };

  const handleDeleteFlight = async (flightId) => {
    showConfirmModal(
      t('admin.confirmDelete'),
      t('admin.confirmDeleteFlightMessage') || 'Это действие нельзя отменить.',
      async () => {
        try {
          await adminAPI.deleteFlight(flightId);
          showToast(t('admin.flightDeleted'), 'success');
          loadFlights();
        } catch (err) {
          showToast(err.response?.data?.detail || t('admin.errorDeleteFlight'), 'error');
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white py-24 text-black border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-7xl font-black mb-6">{t('admin.title')}</h1>
          <p className="text-2xl text-gray-600 font-light">{t('admin.subtitle')}</p>
        </div>
      </div>

      <div className="section-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-10 max-w-4xl mx-auto p-6 bg-red-50 border-l-4 border-red-500 rounded-2xl shadow-lg">
              <div className="flex items-center">
                <svg className="w-7 h-7 text-red-500 mr-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-900 font-bold text-xl">{error}</p>
              </div>
            </div>
          )}

          {/* Tabs - Hidden, navigation moved to Navbar */}
          <div className="hidden flex-wrap gap-2 md:gap-4 mb-12 justify-center">
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-4 md:px-8 py-3 md:py-4 font-black rounded-full transition-all text-sm md:text-base ${
                activeTab === 'statistics'
                  ? 'bg-black text-white shadow-2xl'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <span className="hidden sm:inline">{t('admin.statistics')}</span>
            </button>
            <button
              onClick={() => setActiveTab('airlines')}
              className={`px-4 md:px-8 py-3 md:py-4 font-black rounded-full transition-all text-sm md:text-base ${
                activeTab === 'airlines'
                  ? 'bg-black text-white shadow-2xl'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <span className="hidden sm:inline">{t('admin.airlines')}</span>
            </button>
            <button
              onClick={() => setActiveTab('flights')}
              className={`px-4 md:px-8 py-3 md:py-4 font-black rounded-full transition-all text-sm md:text-base ${
                activeTab === 'flights'
                  ? 'bg-black text-white shadow-2xl'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <span className="hidden sm:inline">{t('admin.flights')}</span>
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-4 md:px-8 py-3 md:py-4 font-black rounded-full transition-all text-sm md:text-base ${
                activeTab === 'clients'
                  ? 'bg-black text-white shadow-2xl'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <span className="hidden sm:inline">{t('admin.clients')}</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 md:px-8 py-3 md:py-4 font-black rounded-full transition-all text-sm md:text-base ${
                activeTab === 'bookings'
                  ? 'bg-black text-white shadow-2xl'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <span className="hidden sm:inline">{t('admin.bookings')}</span>
            </button>
          </div>

          {loading && (
            <div className="text-center py-32">
              <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-black"></div>
              <p className="mt-8 text-gray-600 text-xl font-semibold">{t('admin.loading')}</p>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'statistics' && statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flight-card bg-black text-white border-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 mb-4 text-lg font-semibold uppercase tracking-wide">{t('admin.totalUsers')}</p>
                    <p className="text-6xl font-black">{statistics.total_users}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-5 rounded-2xl">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flight-card bg-black text-white border-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 mb-4 text-lg font-semibold uppercase tracking-wide">{t('admin.totalFlights')}</p>
                    <p className="text-6xl font-black">{statistics.total_flights}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-5 rounded-2xl">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flight-card bg-black text-white border-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 mb-4 text-lg font-semibold uppercase tracking-wide">{t('admin.totalBookings')}</p>
                    <p className="text-6xl font-black">{statistics.total_bookings}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-5 rounded-2xl">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flight-card bg-black text-white border-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 mb-4 text-lg font-semibold uppercase tracking-wide">{t('admin.totalBaggage')}</p>
                    <p className="text-6xl font-black">{statistics.total_baggage}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-5 rounded-2xl">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Airlines Tab */}
          {activeTab === 'airlines' && (
            <>
              <div className="card mb-12 bg-gray-50 border-2 border-gray-200">
                <h3 className="text-3xl font-black text-black mb-10">
                  {editingAirline ? t('admin.editAirline') : t('admin.addAirline')}
                </h3>
                <form onSubmit={editingAirline ? handleUpdateAirline : handleCreateAirline} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {error && activeTab === 'airlines' && (
                    <div className="md:col-span-3 mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                      <p className="text-red-800 font-semibold">{error}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.name')}</label>
                    <input
                      type="text"
                      value={airlineForm.name}
                      onChange={(e) => {
                        setAirlineForm({ ...airlineForm, name: e.target.value });
                        setError(''); // Очищаем ошибку при вводе
                      }}
                      required
                      className="input-field bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.code')}</label>
                    <input
                      type="text"
                      value={airlineForm.code}
                      onChange={(e) => {
                        setAirlineForm({ ...airlineForm, code: e.target.value.toUpperCase() });
                        setError(''); // Очищаем ошибку при вводе
                      }}
                      required
                      maxLength={10}
                      className="input-field bg-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.country')}</label>
                    <input
                      type="text"
                      value={airlineForm.country}
                      onChange={(e) => {
                        setAirlineForm({ ...airlineForm, country: e.target.value });
                        setError(''); // Очищаем ошибку при вводе
                      }}
                      className="input-field bg-white"
                    />
                  </div>
                  <div className="md:col-span-3 flex gap-4">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="btn-primary text-lg px-12 py-5 font-black disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {loading ? t('common.loading') : (editingAirline ? t('admin.updateAirline') : t('admin.createAirline'))}
                    </button>
                    {editingAirline && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAirline(null);
                          setAirlineForm({ name: '', code: '', country: '' });
                        }}
                        className="btn-secondary text-lg px-12 py-5 font-black"
                      >
                        {t('admin.cancel')}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="card bg-gray-50 border-2 border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-3xl font-black text-black">{t('admin.airlineList')}</h3>
                  <input
                    type="text"
                    placeholder={t('admin.search') || 'Поиск...'}
                    value={searchQuery.airlines}
                    onChange={(e) => {
                      setSearchQuery({ ...searchQuery, airlines: e.target.value });
                      setCurrentPage({ ...currentPage, airlines: 1 });
                    }}
                    className="px-4 py-2 border-2 border-gray-300 rounded-full focus:border-black focus:outline-none w-64"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-black">
                      <tr>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.id')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.name')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.code')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.country')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedAirlines.map((airline) => (
                        <tr key={airline.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-8 py-5 whitespace-nowrap text-base text-black font-bold">{airline.id}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base font-black text-black">{airline.name}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base text-gray-600 font-semibold">{airline.code}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base text-gray-600 font-semibold">{airline.country || '-'}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditAirline(airline)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-full transition-colors shadow-lg hover:shadow-xl"
                              >
                                {t('admin.edit')}
                              </button>
                              <button
                                onClick={() => handleDeleteAirline(airline.id)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-full transition-colors shadow-lg hover:shadow-xl"
                              >
                                {t('admin.delete')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={currentPage.airlines}
                  totalPages={totalAirlinesPages}
                  onPageChange={(page) => setCurrentPage({ ...currentPage, airlines: page })}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAirlines.length}
                />
              </div>
            </>
          )}

          {/* Flights Tab */}
          {activeTab === 'flights' && (
            <>
              <div className="card mb-12 bg-gray-50 border-2 border-gray-200">
                <h3 className="text-3xl font-black text-black mb-10">{t('admin.addFlight')}</h3>
                <form onSubmit={handleCreateFlight}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.airline')}</label>
                      <select
                        value={flightForm.airline_id}
                        onChange={(e) => setFlightForm({ ...flightForm, airline_id: e.target.value })}
                        required
                        className="input-field bg-white"
                      >
                        <option value="">{t('admin.selectAirline')}</option>
                        {airlines.map((airline) => (
                          <option key={airline.id} value={airline.id}>
                            {airline.name} ({airline.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.flightNumber')}</label>
                      <input
                        type="text"
                        value={flightForm.flight_number}
                        onChange={(e) => setFlightForm({ ...flightForm, flight_number: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.origin')}</label>
                      <input
                        type="text"
                        value={flightForm.origin}
                        onChange={(e) => setFlightForm({ ...flightForm, origin: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.destination')}</label>
                      <input
                        type="text"
                        value={flightForm.destination}
                        onChange={(e) => setFlightForm({ ...flightForm, destination: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.departureTime')}</label>
                      <input
                        type="datetime-local"
                        value={flightForm.departure_time}
                        onChange={(e) => setFlightForm({ ...flightForm, departure_time: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.arrivalTime')}</label>
                      <input
                        type="datetime-local"
                        value={flightForm.arrival_time}
                        onChange={(e) => setFlightForm({ ...flightForm, arrival_time: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.totalSeats')}</label>
                      <input
                        type="number"
                        value={flightForm.total_seats}
                        onChange={(e) => setFlightForm({ ...flightForm, total_seats: e.target.value })}
                        required
                        min="1"
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.price')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={flightForm.price}
                        onChange={(e) => setFlightForm({ ...flightForm, price: e.target.value })}
                        required
                        min="0"
                        className="input-field bg-white"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary text-lg px-12 py-5 font-black">
                    {t('admin.createFlight')}
                  </button>
                </form>
              </div>

              <div className="card bg-gray-50 border-2 border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-3xl font-black text-black">{t('admin.flightList')}</h3>
                  <input
                    type="text"
                    placeholder={t('admin.search') || 'Поиск...'}
                    value={searchQuery.flights}
                    onChange={(e) => {
                      setSearchQuery({ ...searchQuery, flights: e.target.value });
                      setCurrentPage({ ...currentPage, flights: 1 });
                    }}
                    className="px-4 py-2 border-2 border-gray-300 rounded-full focus:border-black focus:outline-none w-64"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-black">
                      <tr>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.id')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.flightNumber')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.origin')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.destination')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.departure')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.seats')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.price')}</th>
                        <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedFlights.map((flight) => (
                        <tr key={flight.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-8 py-5 whitespace-nowrap text-base text-black font-bold">{flight.id}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base font-black text-black">{flight.flight_number}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base text-gray-600 font-semibold">{flight.origin}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base text-gray-600 font-semibold">{flight.destination}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base text-gray-600 font-semibold">{new Date(flight.departure_time).toLocaleString('ru-RU')}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base text-gray-600 font-semibold">{flight.available_seats}</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base font-black text-black">{flight.price} MDL</td>
                          <td className="px-8 py-5 whitespace-nowrap text-base">
                            <button
                              onClick={() => handleDeleteFlight(flight.id)}
                              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-full transition-colors shadow-lg hover:shadow-xl"
                            >
                              {t('admin.delete')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={currentPage.flights}
                  totalPages={totalFlightsPages}
                  onPageChange={(page) => setCurrentPage({ ...currentPage, flights: page })}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredFlights.length}
                />
              </div>
            </>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <>
              {editingClient && (
                <div className="card mb-12 bg-gray-50 border-2 border-gray-200">
                  <h3 className="text-3xl font-black text-black mb-10">{t('admin.editClient')}</h3>
                  <form onSubmit={handleUpdateClient} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.firstName')}</label>
                      <input
                        type="text"
                        value={clientForm.first_name}
                        onChange={(e) => setClientForm({ ...clientForm, first_name: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.lastName')}</label>
                      <input
                        type="text"
                        value={clientForm.last_name}
                        onChange={(e) => setClientForm({ ...clientForm, last_name: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">Email</label>
                      <input
                        type="email"
                        value={clientForm.email}
                        onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                        required
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('admin.phoneNumber')}</label>
                      <input
                        type="text"
                        value={clientForm.phone}
                        onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                        className="input-field bg-white"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-4">
                      <button type="submit" className="btn-primary text-lg px-12 py-5 font-black">
                        {t('admin.updateClient')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(null);
                          setClientForm({ first_name: '', last_name: '', email: '', phone: '' });
                        }}
                        className="btn-secondary text-lg px-12 py-5 font-black"
                      >
                        {t('admin.cancel')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="card bg-gray-50 border-2 border-gray-200 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-3xl font-black text-black">{t('admin.clientList')}</h3>
                  <input
                    type="text"
                    placeholder={t('admin.search') || 'Поиск...'}
                    value={searchQuery.clients}
                    onChange={(e) => {
                      setSearchQuery({ ...searchQuery, clients: e.target.value });
                      setCurrentPage({ ...currentPage, clients: 1 });
                    }}
                    className="px-4 py-2 border-2 border-gray-300 rounded-full focus:border-black focus:outline-none w-64"
                  />
                </div>
                <div className="w-full overflow-hidden">
                  <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                      <thead className="bg-black">
                        <tr>
                          <th className="px-2 py-3 text-left text-xs font-black text-white uppercase tracking-wide" style={{ width: '5%' }}>ID</th>
                          <th className="px-2 py-3 text-left text-xs font-black text-white uppercase tracking-wide" style={{ width: '18%' }}>Имя</th>
                          <th className="px-2 py-3 text-left text-xs font-black text-white uppercase tracking-wide" style={{ width: '25%' }}>Email</th>
                          <th className="px-2 py-3 text-left text-xs font-black text-white uppercase tracking-wide" style={{ width: '15%' }}>Телефон</th>
                          <th className="px-2 py-3 text-left text-xs font-black text-white uppercase tracking-wide" style={{ width: '8%' }}>Бронь</th>
                          <th className="px-2 py-3 text-left text-xs font-black text-white uppercase tracking-wide" style={{ width: '12%' }}>Дата</th>
                          <th className="px-2 py-3 text-left text-xs font-black text-white uppercase tracking-wide" style={{ width: '17%' }}>Действие</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedClients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-2 py-3 text-sm text-black font-bold">{client.id}</td>
                            <td className="px-2 py-3 text-sm font-black text-black break-words">
                              {client.first_name} {client.last_name}
                            </td>
                            <td className="px-2 py-3 text-sm text-gray-600 font-semibold">
                              <span className="truncate block" title={client.email} style={{ maxWidth: '100%' }}>
                                {client.email}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-sm text-gray-600 font-semibold">
                              <span className="truncate block" title={client.phone || '-'} style={{ maxWidth: '100%' }}>
                                {client.phone || '-'}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-sm font-black text-black text-center">{client.total_bookings}</td>
                            <td className="px-2 py-3 text-sm text-gray-600 font-semibold">
                              {new Date(client.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </td>
                            <td className="px-2 py-3 text-sm">
                              <button
                                onClick={() => handleEditClient(client)}
                                className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-full transition-colors shadow-md hover:shadow-lg whitespace-nowrap"
                              >
                                {t('admin.edit')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={currentPage.clients}
                  totalPages={totalClientsPages}
                  onPageChange={(page) => setCurrentPage({ ...currentPage, clients: page })}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredClients.length}
                />
              </div>
            </>
          )}

          {/* Bookings Management Tab */}
          {activeTab === 'bookings' && (
            <div className="card bg-gray-50 border-2 border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-black text-black">{t('admin.manageBookings')}</h3>
                <input
                  type="text"
                  placeholder={t('admin.search') || 'Поиск...'}
                  value={searchQuery.bookings}
                  onChange={(e) => {
                    setSearchQuery({ ...searchQuery, bookings: e.target.value });
                    setCurrentPage({ ...currentPage, bookings: 1 });
                  }}
                  className="px-4 py-2 border-2 border-gray-300 rounded-full focus:border-black focus:outline-none w-64"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-black">
                    <tr>
                      <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.id')}</th>
                      <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.client')}</th>
                      <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.flightNumber')}</th>
                      <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.seat')}</th>
                      <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.status')}</th>
                      <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.date')}</th>
                      <th className="px-8 py-5 text-left text-sm font-black text-white uppercase tracking-wide">{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap text-base text-black font-bold">{booking.id}</td>
                        <td className="px-8 py-5 whitespace-nowrap text-base font-black text-black">
                          <div>
                            <div>{booking.user_name || t('admin.notSpecified')}</div>
                            <div className="text-sm text-gray-500 font-normal">{booking.user_email}</div>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-base text-gray-600 font-semibold">{booking.flight_number || t('admin.notSpecified')}</td>
                        <td className="px-8 py-5 whitespace-nowrap text-base font-black text-black">{booking.seat_number}</td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {booking.status === 'confirmed' ? t('admin.confirmed') : t('admin.cancelled')}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-base text-gray-600 font-semibold">
                          {new Date(booking.booking_date).toLocaleString()}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-base">
                          <select
                            value={booking.status}
                            onChange={(e) => handleUpdateBooking(booking.id, e.target.value)}
                            className="px-4 py-2 bg-white border-2 border-black rounded-full font-bold text-sm"
                          >
                            <option value="confirmed">{t('admin.confirmed')}</option>
                            <option value="cancelled">{t('admin.cancelled')}</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage.bookings}
                totalPages={totalBookingsPages}
                onPageChange={(page) => setCurrentPage({ ...currentPage, bookings: page })}
                itemsPerPage={itemsPerPage}
                totalItems={filteredBookings.length}
              />
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, onConfirm: null, title: '', message: '' })}
        onConfirm={modal.onConfirm || (() => {})}
        title={modal.title}
        message={modal.message}
        type="danger"
      />
    </div>
  );
}

export default AdminPanel;
