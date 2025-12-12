import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function Register() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: ''
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await register(formData);
      navigate('/flights');
    } catch (err) {
      // Error is handled by register function
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background with gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto bg-black p-6 rounded-3xl w-28 h-28 flex items-center justify-center shadow-2xl mb-8 transform hover:scale-110 transition-transform">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-6xl font-black text-black mb-4">{t('register.title')}</h2>
          <p className="text-gray-600 text-xl">{t('register.subtitle')}</p>
        </div>
        
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-12 border-2 border-white/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('register.firstName')}</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Ion"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('register.lastName')}</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Popescu"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('register.email')}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="your@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('register.phone')}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder={t('register.phonePlaceholder')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">{t('register.password')}</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              className="w-full btn-primary text-lg py-5 font-black"
            >
              {t('register.registerButton')}
            </button>
          </form>
          
          <div className="mt-10 text-center">
            <p className="text-gray-600 text-lg">
              {t('register.haveAccount')}{' '}
              <a href="/login" className="text-black hover:text-gray-800 font-black underline">
                {t('register.loginLink')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
