import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login(email, password);
      console.log('Login successful, token saved:', !!result.access_token);
      
      // Перенаправляем в зависимости от роли
      if (result.user?.is_admin) {
        navigate('/admin');
      } else {
        navigate('/flights');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || t('login.error'));
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
          <h2 className="text-6xl font-black text-black mb-4">{t('login.title')}</h2>
          <p className="text-gray-600 text-xl">{t('login.subtitle')}</p>
        </div>
        
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-12 border-2 border-white/50">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">
                {t('login.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="your@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-black text-black mb-4 uppercase tracking-wide">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              className="w-full btn-primary text-lg py-5 font-black"
            >
              {t('login.loginButton')}
            </button>
          </form>
          
          <div className="mt-10 text-center">
            <p className="text-gray-600 text-lg">
              {t('login.noAccount')}{' '}
              <a href="/register" className="text-black hover:text-gray-800 font-black underline">
                {t('login.registerLink')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
