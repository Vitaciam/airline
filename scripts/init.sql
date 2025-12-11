-- Создание таблиц для всех микросервисов

-- Пользователи (Auth Service)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Авиакомпании (Admin Service)
CREATE TABLE IF NOT EXISTS airlines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Рейсы (Admin Service)
CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    airline_id INTEGER REFERENCES airlines(id) ON DELETE CASCADE,
    flight_number VARCHAR(20) NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Бронирования (Booking Service)
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    flight_id INTEGER REFERENCES flights(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'confirmed',
    UNIQUE(flight_id, seat_number)
);

-- Багаж (Baggage Service)
CREATE TABLE IF NOT EXISTS baggage (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    baggage_tag VARCHAR(50) UNIQUE NOT NULL,
    weight DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'checked_in',
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Платежи (Payment Service)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    refund_id VARCHAR(100)
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_baggage_booking_id ON baggage(booking_id);
CREATE INDEX IF NOT EXISTS idx_baggage_tag ON baggage(baggage_tag);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);

