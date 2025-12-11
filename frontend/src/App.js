import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Flights from './pages/Flights';
import MyBookings from './pages/MyBookings';
import BaggageStatus from './pages/BaggageStatus';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Receipt from './pages/Receipt';
import { AuthProvider, useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user && user.is_admin ? children : <Navigate to="/flights" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/flights"
        element={
          <PrivateRoute>
            <Flights />
          </PrivateRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <PrivateRoute>
            <MyBookings />
          </PrivateRoute>
        }
      />
      <Route
        path="/baggage"
        element={
          <PrivateRoute>
            <BaggageStatus />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
      <Route
        path="/receipt/:paymentId"
        element={
          <PrivateRoute>
            <Receipt />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function AppContent() {
  const location = useLocation();
  const { user } = useAuth();
  const showNavbar = !['/'].includes(location.pathname) || user;
  const showFooter = user && !['/login', '/register', '/'].includes(location.pathname);
  
  return (
    <div className="App min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        <AppRoutes />
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;

