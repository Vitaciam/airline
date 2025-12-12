import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os
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

# Use same secret as default in main.py or set via env var
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-jwt-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


@pytest.fixture
def db():
    """Create database tables and session for testing"""
    # Clean up before creating new tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Create test tables (drop first to avoid conflicts)
        db.execute(text("DROP TABLE IF EXISTS payments"))
        db.execute(text("DROP TABLE IF EXISTS bookings"))
        db.execute(text("DROP TABLE IF EXISTS flights"))
        db.execute(text("""
            CREATE TABLE bookings (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                flight_id INTEGER,
                seat_number TEXT,
                status TEXT
            )
        """))
        db.execute(text("""
            CREATE TABLE flights (
                id INTEGER PRIMARY KEY,
                flight_number TEXT,
                origin TEXT,
                destination TEXT,
                price REAL
            )
        """))
        db.execute(text("""
            CREATE TABLE payments (
                id INTEGER PRIMARY KEY,
                booking_id INTEGER,
                user_id INTEGER,
                payment_id TEXT UNIQUE,
                amount REAL,
                currency TEXT,
                payment_method TEXT,
                status TEXT,
                created_at TIMESTAMP,
                completed_at TIMESTAMP,
                refund_id TEXT
            )
        """))
        db.commit()
        yield db
    finally:
        db.rollback()
        db.execute(text("DROP TABLE IF EXISTS payments"))
        db.execute(text("DROP TABLE IF EXISTS bookings"))
        db.execute(text("DROP TABLE IF EXISTS flights"))
        db.commit()
        db.close()


@pytest.fixture
def client(db):
    """Create test client with database override"""
    import os
    # Set environment variables for JWT
    os.environ["JWT_SECRET"] = JWT_SECRET
    os.environ["JWT_ALGORITHM"] = JWT_ALGORITHM
    
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
def test_booking_and_flight(db):
    """Create test booking and flight"""
    # Clear existing data first
    db.execute(text("DELETE FROM bookings"))
    db.execute(text("DELETE FROM flights"))
    db.commit()
    
    db.execute(text("""
        INSERT INTO flights (id, flight_number, origin, destination, price)
        VALUES (1, 'FL001', 'Paris', 'London', 299.99)
    """))
    db.execute(text("""
        INSERT INTO bookings (id, user_id, flight_id, seat_number, status)
        VALUES (1, 1, 1, 'A1', 'confirmed')
    """))
    db.commit()
    return {"booking_id": 1, "flight_id": 1}


class TestPaymentCreation:
    """Test payment creation endpoints"""
    
    def test_create_payment_success(self, client, test_booking_and_flight, test_token):
        """Test successful payment creation"""
        payment_data = {
            "booking_id": 1,
            "payment_method": "card",
            "amount": 299.99,
            "currency": "USD"
        }
        # The notification call is wrapped in try-except, so it won't fail even if httpx fails
        # We can test without mocking since the notification is non-blocking
        response = client.post(
            "/payments",
            json=payment_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"
        data = response.json()
        assert data["booking_id"] == 1
        assert data["amount"] == 299.99
        assert data["status"] == "completed"
        assert "payment_id" in data
    
    def test_create_payment_wrong_amount(self, client, test_booking_and_flight, test_token):
        """Test payment with wrong amount"""
        payment_data = {
            "booking_id": 1,
            "payment_method": "card",
            "amount": 199.99,  # Wrong amount
            "currency": "USD"
        }
        response = client.post(
            "/payments",
            json=payment_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 400
        assert "amount" in response.json()["detail"].lower()
    
    def test_create_payment_duplicate(self, client, test_booking_and_flight, test_token, db):
        """Test creating duplicate payment"""
        # Create first payment
        db.execute(text("""
            INSERT INTO payments (id, booking_id, user_id, payment_id, amount, 
                                 currency, payment_method, status, created_at)
            VALUES (1, 1, 1, 'PAY-123456', 299.99, 'USD', 'card', 'completed', datetime('now'))
        """))
        db.commit()
        
        payment_data = {
            "booking_id": 1,
            "payment_method": "card",
            "amount": 299.99,
            "currency": "USD"
        }
        response = client.post(
            "/payments",
            json=payment_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 400
        assert "already completed" in response.json()["detail"].lower()


class TestPaymentQueries:
    """Test payment query endpoints"""
    
    def test_get_my_payments(self, client, test_token, db):
        """Test getting user's payments"""
        # Clear and create test data
        db.execute(text("DELETE FROM payments"))
        db.execute(text("DELETE FROM bookings"))
        db.execute(text("DELETE FROM flights"))
        db.execute(text("""
            INSERT INTO flights (id, flight_number, origin, destination, price)
            VALUES (1, 'FL001', 'Paris', 'London', 299.99)
        """))
        db.execute(text("""
            INSERT INTO bookings (id, user_id, flight_id, seat_number, status)
            VALUES (1, 1, 1, 'A1', 'confirmed')
        """))
        # Create payment
        db.execute(text("""
            INSERT INTO payments (id, booking_id, user_id, payment_id, amount, 
                                 currency, payment_method, status, created_at)
            VALUES (1, 1, 1, 'PAY-123456', 299.99, 'USD', 'card', 'completed', datetime('now'))
        """))
        db.commit()
        
        response = client.get(
            "/payments",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200
        payments = response.json()
        assert len(payments) == 1
    
    def test_get_payment_by_id(self, client, test_token, db):
        """Test getting specific payment"""
        # Clear and create test data
        db.execute(text("DELETE FROM payments"))
        db.execute(text("DELETE FROM bookings"))
        db.execute(text("DELETE FROM flights"))
        db.execute(text("""
            INSERT INTO flights (id, flight_number, origin, destination, price)
            VALUES (1, 'FL001', 'Paris', 'London', 299.99)
        """))
        db.execute(text("""
            INSERT INTO bookings (id, user_id, flight_id, seat_number, status)
            VALUES (1, 1, 1, 'A1', 'confirmed')
        """))
        # Create payment
        db.execute(text("""
            INSERT INTO payments (id, booking_id, user_id, payment_id, amount, 
                                 currency, payment_method, status, created_at)
            VALUES (1, 1, 1, 'PAY-123456', 299.99, 'USD', 'card', 'completed', datetime('now'))
        """))
        db.commit()
        
        response = client.get(
            "/payments/PAY-123456",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200
        payment = response.json()
        assert payment["payment_id"] == "PAY-123456"


class TestRefund:
    """Test refund endpoints"""
    
    def test_refund_payment(self, client, test_token, db):
        """Test refunding a payment"""
        # Create flight and booking first (required for payment)
        db.execute(text("DELETE FROM bookings"))
        db.execute(text("DELETE FROM flights"))
        db.execute(text("""
            INSERT INTO flights (id, flight_number, origin, destination, price)
            VALUES (1, 'FL001', 'Paris', 'London', 299.99)
        """))
        db.execute(text("""
            INSERT INTO bookings (id, user_id, flight_id, seat_number, status)
            VALUES (1, 1, 1, 'A1', 'confirmed')
        """))
        # Create completed payment
        db.execute(text("""
            INSERT INTO payments (id, booking_id, user_id, payment_id, amount, 
                                 currency, payment_method, status, created_at, completed_at)
            VALUES (1, 1, 1, 'PAY-123456', 299.99, 'USD', 'card', 'completed', datetime('now'), datetime('now'))
        """))
        db.commit()
        
        refund_data = {
            "payment_id": "PAY-123456",
            "reason": "Customer request"
        }
        response = client.post(
            "/payments/PAY-123456/refund",
            json=refund_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"
        data = response.json()
        assert data["status"] == "refunded"
        assert "refund_id" in data


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "payment-service"

