import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, AsyncMock
import sys
import os
from datetime import datetime
from jose import jwt

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import app, get_db, Base

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
            CREATE TABLE IF NOT EXISTS airlines (
                id INTEGER PRIMARY KEY,
                name TEXT,
                code TEXT UNIQUE,
                country TEXT,
                created_at TIMESTAMP
            )
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS flights (
                id INTEGER PRIMARY KEY,
                airline_id INTEGER,
                flight_number TEXT,
                origin TEXT,
                destination TEXT,
                departure_time TIMESTAMP,
                arrival_time TIMESTAMP,
                total_seats INTEGER,
                available_seats INTEGER,
                price REAL,
                created_at TIMESTAMP
            )
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                email TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                is_admin INTEGER,
                created_at TIMESTAMP
            )
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                flight_id INTEGER,
                seat_number TEXT,
                status TEXT,
                booking_date TIMESTAMP
            )
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS baggage (
                id INTEGER PRIMARY KEY,
                booking_id INTEGER,
                baggage_tag TEXT,
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
def admin_token():
    """Create a test admin JWT token"""
    data = {"sub": "1", "is_admin": True}
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


class TestAirlines:
    """Test airline management endpoints"""
    
    @patch('main.verify_admin_token')
    def test_create_airline(self, mock_verify, client, admin_token):
        """Test creating an airline"""
        mock_verify.return_value = {"user_id": 1}
        
        airline_data = {
            "name": "Test Airlines",
            "code": "TA",
            "country": "Test Country"
        }
        response = client.post(
            "/airlines",
            json=airline_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Airlines"
        assert data["code"] == "TA"
    
    @patch('main.verify_admin_token')
    def test_get_airlines(self, mock_verify, client, admin_token, db):
        """Test getting all airlines"""
        mock_verify.return_value = {"user_id": 1}
        
        # Create test airline
        db.execute(text("""
            INSERT INTO airlines (name, code, country, created_at)
            VALUES ('Test Airlines', 'TA', 'Test Country', datetime('now'))
        """))
        db.commit()
        
        response = client.get(
            "/airlines",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        airlines = response.json()
        assert len(airlines) == 1


class TestFlights:
    """Test flight management endpoints"""
    
    @patch('main.verify_admin_token')
    def test_create_flight(self, mock_verify, client, admin_token, db):
        """Test creating a flight"""
        mock_verify.return_value = {"user_id": 1}
        
        # Create airline first
        db.execute(text("""
            INSERT INTO airlines (id, name, code, country, created_at)
            VALUES (1, 'Test Airlines', 'TA', 'Test Country', datetime('now'))
        """))
        db.commit()
        
        flight_data = {
            "airline_id": 1,
            "flight_number": "FL001",
            "origin": "Paris",
            "destination": "London",
            "departure_time": "2024-12-25T10:00:00",
            "arrival_time": "2024-12-25T12:00:00",
            "total_seats": 100,
            "price": 299.99
        }
        response = client.post(
            "/flights",
            json=flight_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["flight_number"] == "FL001"


class TestStatistics:
    """Test statistics endpoint"""
    
    @patch('main.verify_admin_token')
    def test_get_statistics(self, mock_verify, client, admin_token, db):
        """Test getting system statistics"""
        mock_verify.return_value = {"user_id": 1}
        
        # Create test data
        db.execute(text("""
            INSERT INTO users (id, email, first_name, last_name, is_admin, created_at)
            VALUES (1, 'test@example.com', 'Test', 'User', 0, datetime('now'))
        """))
        db.execute(text("""
            INSERT INTO flights (id, flight_number, created_at)
            VALUES (1, 'FL001', datetime('now'))
        """))
        db.execute(text("""
            INSERT INTO bookings (id, user_id, flight_id, status)
            VALUES (1, 1, 1, 'confirmed')
        """))
        db.execute(text("""
            INSERT INTO baggage (id, booking_id, baggage_tag, status)
            VALUES (1, 1, 'ABC123', 'checked_in')
        """))
        db.commit()
        
        response = client.get(
            "/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_users"] == 1
        assert data["total_flights"] == 1
        assert data["total_bookings"] == 1
        assert data["total_baggage"] == 1


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "admin-service"

