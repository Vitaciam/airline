import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, MagicMock
import sys
import os
from jose import jwt

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import app, get_db, send_email

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
    db = TestingSessionLocal()
    try:
        # Drop tables first to avoid conflicts
        db.execute(text("DROP TABLE IF EXISTS flights"))
        db.execute(text("DROP TABLE IF EXISTS bookings"))
        db.execute(text("DROP TABLE IF EXISTS users"))
        
        # Create test tables
        db.execute(text("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                email TEXT,
                first_name TEXT,
                last_name TEXT
            )
        """))
        db.execute(text("""
            CREATE TABLE bookings (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                flight_id INTEGER,
                status TEXT
            )
        """))
        db.execute(text("""
            CREATE TABLE flights (
                id INTEGER PRIMARY KEY,
                flight_number TEXT,
                origin TEXT,
                destination TEXT,
                departure_time TIMESTAMP,
                arrival_time TIMESTAMP
            )
        """))
        db.commit()
        yield db
    finally:
        db.rollback()
        # Clean up tables
        db.execute(text("DROP TABLE IF EXISTS flights"))
        db.execute(text("DROP TABLE IF EXISTS bookings"))
        db.execute(text("DROP TABLE IF EXISTS users"))
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
def test_user(db):
    """Create a test user"""
    # Clear existing data first
    db.execute(text("DELETE FROM users"))
    db.execute(text("""
        INSERT INTO users (id, email, first_name, last_name)
        VALUES (1, 'test@example.com', 'Test', 'User')
    """))
    db.commit()
    return {"id": 1, "email": "test@example.com"}


class TestEmailSending:
    """Test email sending functionality"""
    
    def test_send_email_no_smtp_config(self):
        """Test email sending when SMTP is not configured"""
        # When SMTP is not configured (empty env vars), send_email should return True (logs instead)
        # Since SMTP_USER and SMTP_PASSWORD are empty by default in tests, this should work
        # We test that function doesn't crash and returns True when SMTP is not configured
        original_smtp_user = os.environ.get("SMTP_USER", "")
        original_smtp_password = os.environ.get("SMTP_PASSWORD", "")
        
        # Ensure SMTP is not configured
        os.environ["SMTP_USER"] = ""
        os.environ["SMTP_PASSWORD"] = ""
        
        # Import fresh to pick up new env vars
        import importlib
        import main
        importlib.reload(main)
        
        try:
            result = main.send_email(
                to_email="test@example.com",
                subject="Test",
                body="Test body"
            )
            assert result is True  # Should log instead of sending
        finally:
            # Restore original values
            os.environ["SMTP_USER"] = original_smtp_user
            os.environ["SMTP_PASSWORD"] = original_smtp_password
            importlib.reload(main)
    
    def test_send_email_with_smtp(self):
        """Test email sending with SMTP configured"""
        # Mock SMTP
        with patch('main.smtplib.SMTP') as mock_smtp:
            mock_server = MagicMock()
            mock_smtp.return_value.__enter__.return_value = mock_server
            
            # Set SMTP config
            original_smtp_user = os.environ.get("SMTP_USER", "")
            original_smtp_password = os.environ.get("SMTP_PASSWORD", "")
            
            os.environ["SMTP_USER"] = "test@example.com"
            os.environ["SMTP_PASSWORD"] = "password"
            
            # Import fresh to pick up new env vars
            import importlib
            import main
            importlib.reload(main)
            
            try:
                result = main.send_email(
                    to_email="recipient@example.com",
                    subject="Test Subject",
                    body="Test body",
                    html="<p>Test body</p>"
                )
                assert result is True
                mock_server.starttls.assert_called_once()
                mock_server.login.assert_called_once()
                mock_server.send_message.assert_called_once()
            finally:
                # Restore original values
                os.environ["SMTP_USER"] = original_smtp_user
                os.environ["SMTP_PASSWORD"] = original_smtp_password
                importlib.reload(main)


class TestNotificationEndpoints:
    """Test notification endpoints"""
    
    def test_send_email_internal(self, client, test_user):
        """Test sending email via internal endpoint"""
        with patch('main.send_email', return_value=True):
            email_data = {
                "to": "test@example.com",
                "subject": "Test Subject",
                "body": "Test body",
                "html": "<p>Test body</p>"
            }
            response = client.post("/send-email-internal", json=email_data)
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Email sent successfully"
    
    def test_notify_booking_internal(self, client, test_user):
        """Test booking notification via internal endpoint"""
        with patch('main.send_email', return_value=True):
            notification_data = {
                "user_id": 1,
                "flight_number": "FL001",
                "origin": "Paris",
                "destination": "London",
                "departure_time": "2024-12-25T10:00:00",
                "seat_number": "A1"
            }
            response = client.post("/notify-booking-internal", json=notification_data)
            assert response.status_code == 200
            data = response.json()
            assert "sent" in data["message"].lower()
    
    def test_notify_baggage(self, client, test_user, test_token):
        """Test baggage notification"""
        with patch('main.send_email', return_value=True):
            notification_data = {
                "user_id": 1,
                "baggage_tag": "ABC123456",
                "status": "in_transit",
                "location": "In transit"
            }
            response = client.post(
                "/notify-baggage",
                json=notification_data,
                headers={"Authorization": f"Bearer {test_token}"}
            )
            assert response.status_code == 200
    
    def test_notify_payment(self, client, test_user):
        """Test payment notification"""
        with patch('main.send_email', return_value=True):
            notification_data = {
                "user_id": 1,
                "payment_id": "PAY-123456",
                "amount": 299.99,
                "currency": "USD",
                "payment_method": "card",
                "booking_id": 1,
                "flight_number": "FL001",
                "origin": "Paris",
                "destination": "London"
            }
            response = client.post("/notify-payment", json=notification_data)
            assert response.status_code == 200


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "notification-service"

