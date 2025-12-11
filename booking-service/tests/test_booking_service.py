import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, AsyncMock
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import app, get_db, Base, verify_token
from jose import jwt

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

JWT_SECRET = "test-secret-key"
JWT_ALGORITHM = "HS256"


@pytest.fixture
def db():
    """Create database tables and session for testing"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Create test tables
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS flights (
                id INTEGER PRIMARY KEY,
                flight_number TEXT,
                origin TEXT,
                destination TEXT,
                departure_time TIMESTAMP,
                arrival_time TIMESTAMP,
                total_seats INTEGER,
                available_seats INTEGER,
                price REAL
            )
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                flight_id INTEGER,
                seat_number TEXT,
                booking_date TIMESTAMP,
                status TEXT
            )
        """))
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    """Create test client with database override"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_token():
    """Create a test JWT token"""
    data = {"sub": "1"}
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


@pytest.fixture
def test_flight(db):
    """Create a test flight"""
    db.execute(text("""
        INSERT INTO flights (id, flight_number, origin, destination, 
                           departure_time, arrival_time, total_seats, 
                           available_seats, price)
        VALUES (1, 'FL001', 'Paris', 'London', 
                datetime('now', '+1 day'), datetime('now', '+2 days'),
                100, 50, 299.99)
    """))
    db.commit()
    return {"id": 1, "flight_number": "FL001"}


class TestFlights:
    """Test flight endpoints"""
    
    def test_get_flights_empty(self, client):
        """Test getting flights when none exist"""
        response = client.get("/flights")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_flights_with_data(self, client, test_flight):
        """Test getting flights with data"""
        response = client.get("/flights")
        assert response.status_code == 200
        flights = response.json()
        assert len(flights) == 1
        assert flights[0]["flight_number"] == "FL001"
    
    def test_get_flight_by_id(self, client, test_flight):
        """Test getting specific flight"""
        response = client.get("/flights/1")
        assert response.status_code == 200
        flight = response.json()
        assert flight["id"] == 1
        assert flight["flight_number"] == "FL001"
    
    def test_get_flight_not_found(self, client):
        """Test getting non-existent flight"""
        response = client.get("/flights/999")
        assert response.status_code == 404
    
    def test_get_booked_seats(self, client, test_flight, test_token, db):
        """Test getting booked seats for a flight"""
        # Create a booking
        db.execute(text("""
            INSERT INTO bookings (user_id, flight_id, seat_number, status)
            VALUES (1, 1, 'A1', 'confirmed')
        """))
        db.commit()
        
        response = client.get("/flights/1/booked-seats")
        assert response.status_code == 200
        data = response.json()
        assert "booked_seats" in data
        assert "A1" in data["booked_seats"]


class TestBookings:
    """Test booking endpoints"""
    
    def test_create_booking_success(self, client, test_flight, test_token, db):
        """Test successful booking creation"""
        booking_data = {
            "flight_id": 1,
            "seat_number": "A2"
        }
        response = client.post(
            "/bookings",
            json=booking_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["flight_id"] == 1
        assert data["seat_number"] == "A2"
        assert data["status"] == "confirmed"
    
    def test_create_booking_no_seats(self, client, test_token, db):
        """Test booking when no seats available"""
        # Create flight with 0 available seats
        db.execute(text("""
            INSERT INTO flights (id, flight_number, origin, destination, 
                               departure_time, arrival_time, total_seats, 
                               available_seats, price)
            VALUES (2, 'FL002', 'Paris', 'London', 
                    datetime('now', '+1 day'), datetime('now', '+2 days'),
                    100, 0, 299.99)
        """))
        db.commit()
        
        booking_data = {
            "flight_id": 2,
            "seat_number": "A1"
        }
        response = client.post(
            "/bookings",
            json=booking_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 400
        assert "available" in response.json()["detail"].lower()
    
    def test_create_booking_duplicate_seat(self, client, test_flight, test_token, db):
        """Test booking duplicate seat"""
        # Create first booking
        db.execute(text("""
            INSERT INTO bookings (user_id, flight_id, seat_number, status)
            VALUES (1, 1, 'A1', 'confirmed')
        """))
        db.commit()
        
        booking_data = {
            "flight_id": 1,
            "seat_number": "A1"
        }
        response = client.post(
            "/bookings",
            json=booking_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 400
        assert "already booked" in response.json()["detail"].lower()
    
    def test_get_my_bookings(self, client, test_token, db):
        """Test getting user's bookings"""
        # Create booking
        db.execute(text("""
            INSERT INTO bookings (id, user_id, flight_id, seat_number, status)
            VALUES (1, 1, 1, 'A1', 'confirmed')
        """))
        db.commit()
        
        response = client.get(
            "/bookings",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200
        bookings = response.json()
        assert len(bookings) == 1
    
    def test_get_booking_by_id(self, client, test_token, db):
        """Test getting specific booking"""
        # Create booking
        db.execute(text("""
            INSERT INTO bookings (id, user_id, flight_id, seat_number, status)
            VALUES (1, 1, 1, 'A1', 'confirmed')
        """))
        db.commit()
        
        response = client.get(
            "/bookings/1",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200
        booking = response.json()
        assert booking["id"] == 1
    
    def test_cancel_booking(self, client, test_token, db):
        """Test canceling a booking"""
        # Create booking
        db.execute(text("""
            INSERT INTO bookings (id, user_id, flight_id, seat_number, status)
            VALUES (1, 1, 1, 'A1', 'confirmed')
        """))
        db.commit()
        
        response = client.delete(
            "/bookings/1",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 204


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "booking-service"

