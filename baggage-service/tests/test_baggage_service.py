import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os
from jose import jwt

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import app, get_db, Base, generate_baggage_tag, check_booking_ownership

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
        # Drop tables first to avoid conflicts
        db.execute(text("DROP TABLE IF EXISTS baggage"))
        db.execute(text("DROP TABLE IF EXISTS bookings"))
        
        # Create test tables
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
            CREATE TABLE baggage (
                id INTEGER PRIMARY KEY,
                booking_id INTEGER,
                baggage_tag TEXT UNIQUE,
                weight REAL,
                status TEXT,
                location TEXT,
                created_at TIMESTAMP
            )
        """))
        db.commit()
        yield db
    finally:
        db.rollback()
        # Clean up tables
        db.execute(text("DROP TABLE IF EXISTS baggage"))
        db.execute(text("DROP TABLE IF EXISTS bookings"))
        db.commit()
        db.close()


@pytest.fixture
def client(db):
    """Create test client with database override"""
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
def test_booking(db):
    """Create a test booking"""
    # Clear existing data first
    db.execute(text("DELETE FROM bookings"))
    db.execute(text("""
        INSERT INTO bookings (id, user_id, flight_id, seat_number, status)
        VALUES (1, 1, 1, 'A1', 'confirmed')
    """))
    db.commit()
    return {"id": 1, "user_id": 1}


class TestBaggageTagGeneration:
    """Test baggage tag generation"""
    
    def test_generate_baggage_tag(self):
        """Test baggage tag generation"""
        tag = generate_baggage_tag()
        assert tag is not None
        assert len(tag) == 9  # 3 letters + 6 numbers
        assert tag[:3].isalpha()
        assert tag[3:].isdigit()


class TestBaggageCreation:
    """Test baggage creation endpoints"""
    
    def test_create_baggage_success(self, client, test_booking, test_token):
        """Test successful baggage creation"""
        baggage_data = {
            "booking_id": 1,
            "weight": 23.5
        }
        response = client.post(
            "/baggage",
            json=baggage_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["booking_id"] == 1
        assert data["weight"] == 23.5
        assert data["status"] == "checked_in"
        assert "baggage_tag" in data
    
    def test_create_baggage_wrong_booking(self, client, test_token):
        """Test creating baggage for non-existent booking"""
        baggage_data = {
            "booking_id": 999,
            "weight": 23.5
        }
        response = client.post(
            "/baggage",
            json=baggage_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 404


class TestBaggageQueries:
    """Test baggage query endpoints"""
    
    def test_get_baggage_status(self, client, test_booking, test_token, db):
        """Test getting baggage status"""
        # Create baggage
        db.execute(text("""
            INSERT INTO baggage (id, booking_id, baggage_tag, status, location, created_at)
            VALUES (1, 1, 'ABC123456', 'checked_in', 'Airport Check-in', datetime('now'))
        """))
        db.commit()
        
        response = client.get(
            "/baggage/status/ABC123456",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["baggage_tag"] == "ABC123456"
        assert data["status"] == "checked_in"
    
    def test_get_baggage_by_booking(self, client, test_booking, test_token, db):
        """Test getting baggage by booking ID"""
        # Create baggage
        db.execute(text("""
            INSERT INTO baggage (id, booking_id, baggage_tag, status, location, created_at)
            VALUES (1, 1, 'ABC123456', 'checked_in', 'Airport Check-in', datetime('now'))
        """))
        db.commit()
        
        response = client.get(
            "/baggage/booking/1",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200
        baggage_list = response.json()
        assert len(baggage_list) == 1
    
    def test_get_my_baggage(self, client, test_booking, test_token, db):
        """Test getting all user's baggage"""
        # Create baggage
        db.execute(text("""
            INSERT INTO baggage (id, booking_id, baggage_tag, status, location, created_at)
            VALUES (1, 1, 'ABC123456', 'checked_in', 'Airport Check-in', datetime('now'))
        """))
        db.commit()
        
        response = client.get(
            "/baggage/my",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200
        baggage_list = response.json()
        assert len(baggage_list) == 1


class TestBaggageUpdate:
    """Test baggage update endpoints"""
    
    def test_update_baggage(self, client, test_booking, test_token, db):
        """Test updating baggage status"""
        # Create baggage
        db.execute(text("""
            INSERT INTO baggage (id, booking_id, baggage_tag, status, location, created_at)
            VALUES (1, 1, 'ABC123456', 'checked_in', 'Airport Check-in', datetime('now'))
        """))
        db.commit()
        
        update_data = {
            "status": "in_transit",
            "location": "In transit"
        }
        response = client.put(
            "/baggage/1",
            json=update_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_transit"
        assert data["location"] == "In transit"


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "baggage-service"

