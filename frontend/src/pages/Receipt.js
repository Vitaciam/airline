import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/api';

function Receipt() {
  const { t } = useTranslation();
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getReceipt(paymentId);
      setReceipt(response.data);
    } catch (err) {
      console.error('Error loading receipt:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
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

  if (!receipt) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-black text-black mb-5">{t('receipt.notFound')}</h2>
          <button onClick={() => navigate('/bookings')} className="btn-primary text-lg px-12 py-5 font-black">
            {t('receipt.backToBookings')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white py-24 text-black border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-7xl font-black mb-6">{t('receipt.title')}</h1>
          <p className="text-2xl text-gray-600 font-light">{t('receipt.subtitle')}</p>
        </div>
      </div>

      <div className="section-gradient py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Print button - hidden when printing */}
          <div className="mb-8 text-right print:hidden">
            <button
              onClick={handlePrint}
              className="px-8 py-4 bg-black hover:bg-gray-800 text-white font-black rounded-full transition-colors shadow-lg hover:shadow-xl"
            >
              {t('receipt.print')}
            </button>
            <button
              onClick={() => navigate('/bookings')}
              className="ml-4 px-8 py-4 bg-white hover:bg-gray-50 text-black font-black rounded-full border-2 border-black transition-colors shadow-lg"
            >
              {t('common.cancel')}
            </button>
          </div>

          {/* Receipt Card */}
          <div className="card bg-white border-2 border-gray-200 print:border-none print:shadow-none">
            {/* Header */}
            <div className="border-b-2 border-gray-200 pb-8 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-4xl font-black text-black mb-2">Airline</h2>
                  <p className="text-gray-600">{t('receipt.companyInfo')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{t('receipt.receiptNumber')}</p>
                  <p className="text-2xl font-black text-black">{receipt.payment.payment_id}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-8">
              <h3 className="text-xl font-black text-black mb-4 uppercase tracking-wide">{t('receipt.customerInfo')}</h3>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-lg font-black text-black mb-2">
                  {receipt.user.first_name} {receipt.user.last_name}
                </p>
                <p className="text-gray-600">{receipt.user.email}</p>
                {receipt.user.phone && <p className="text-gray-600">{receipt.user.phone}</p>}
              </div>
            </div>

            {/* Flight Details */}
            <div className="mb-8">
              <h3 className="text-xl font-black text-black mb-4 uppercase tracking-wide">{t('receipt.flightDetails')}</h3>
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{t('flights.flightNumber')}</p>
                    <p className="text-2xl font-black text-black">{receipt.flight.flight_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{t('bookings.seat')}</p>
                    <p className="text-2xl font-black text-black">{receipt.booking.seat_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{t('flights.from')}</p>
                    <p className="text-xl font-black text-black">{receipt.flight.origin}</p>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(receipt.flight.departure_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{t('flights.to')}</p>
                    <p className="text-xl font-black text-black">{receipt.flight.destination}</p>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(receipt.flight.arrival_time)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-8">
              <h3 className="text-xl font-black text-black mb-4 uppercase tracking-wide">{t('receipt.paymentDetails')}</h3>
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">{t('payment.amount')}:</span>
                    <span className="text-3xl font-black text-black">
                      {receipt.payment.amount} {receipt.payment.currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">{t('payment.paymentMethod')}:</span>
                    <span className="text-lg font-black text-black">{receipt.payment.payment_method}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">{t('receipt.paymentDate')}:</span>
                    <span className="text-lg font-black text-black">{formatDate(receipt.payment.completed_at)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">{t('payment.paymentStatus')}:</span>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                      receipt.payment.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {receipt.payment.status === 'completed' ? t('payment.paid') : receipt.payment.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-200 pt-8 mt-8 text-center text-gray-600">
              <p className="text-sm">{t('receipt.thankYou')}</p>
              <p className="text-sm mt-2">{t('receipt.contactInfo')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Receipt;

