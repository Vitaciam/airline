import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import app, get_db, Base, get_password_hash, verify_password, create_access_token
from datetime import timedelta

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    """Create database tables and session for testing"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
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
def test_user_data():
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+1234567890"
    }


class TestPasswordHashing:
    """Test password hashing functions"""
    
    def test_hash_password(self):
        """Test password hashing"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        assert hashed != password
        assert len(hashed) > 0
    
    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        assert verify_password("wrongpassword", hashed) is False


class TestJWTToken:
    """Test JWT token creation"""
    
    def test_create_access_token(self):
        """Test access token creation"""
        data = {"sub": "123"}
        token = create_access_token(data)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_access_token_with_expiry(self):
        """Test access token creation with custom expiry"""
        data = {"sub": "123"}
        expires_delta = timedelta(hours=1)
        token = create_access_token(data, expires_delta=expires_delta)
        assert token is not None


class TestUserRegistration:
    """Test user registration endpoints"""
    
    def test_register_user_success(self, client, test_user_data):
        """Test successful user registration"""
        response = client.post("/register", json=test_user_data)
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == test_user_data["email"]
        assert data["user"]["first_name"] == test_user_data["first_name"]
        assert data["user"]["last_name"] == test_user_data["last_name"]
        assert "password" not in data["user"]
    
    def test_register_duplicate_email(self, client, test_user_data):
        """Test registration with duplicate email"""
        # Register first user
        client.post("/register", json=test_user_data)
        # Try to register again with same email
        response = client.post("/register", json=test_user_data)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, client, test_user_data):
        """Test registration with invalid email"""
        test_user_data["email"] = "invalid-email"
        response = client.post("/register", json=test_user_data)
        assert response.status_code == 422  # Validation error
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields"""
        response = client.post("/register", json={"email": "test@example.com"})
        assert response.status_code == 422  # Validation error


class TestUserLogin:
    """Test user login endpoints"""
    
    def test_login_success(self, client, test_user_data):
        """Test successful login"""
        # Register user first
        client.post("/register", json=test_user_data)
        # Login
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        response = client.post("/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == test_user_data["email"]
    
    def test_login_wrong_password(self, client, test_user_data):
        """Test login with wrong password"""
        # Register user first
        client.post("/register", json=test_user_data)
        # Try to login with wrong password
        login_data = {
            "email": test_user_data["email"],
            "password": "wrongpassword"
        }
        response = client.post("/login", json=login_data)
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123"
        }
        response = client.post("/login", json=login_data)
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()


class TestUserProfile:
    """Test user profile endpoints"""
    
    def test_get_current_user(self, client, test_user_data):
        """Test getting current user info"""
        # Register and login
        register_response = client.post("/register", json=test_user_data)
        token = register_response.json()["access_token"]
        
        # Get current user
        response = client.get(
            "/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["first_name"] == test_user_data["first_name"]
    
    def test_get_current_user_no_token(self, client):
        """Test getting current user without token"""
        response = client.get("/me")
        assert response.status_code == 403
    
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token"""
        response = client.get(
            "/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
    
    def test_update_profile(self, client, test_user_data):
        """Test updating user profile"""
        # Register and login
        register_response = client.post("/register", json=test_user_data)
        token = register_response.json()["access_token"]
        
        # Update profile
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "phone": "+9876543210"
        }
        response = client.put(
            "/profile",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["first_name"] == "Updated"
        assert data["user"]["last_name"] == "Name"
        assert data["user"]["phone"] == "+9876543210"
        assert "access_token" in data


class TestTokenVerification:
    """Test token verification endpoints"""
    
    def test_verify_token(self, client, test_user_data):
        """Test token verification"""
        # Register and login
        register_response = client.post("/register", json=test_user_data)
        token = register_response.json()["access_token"]
        
        # Verify token
        response = client.get(
            "/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert "user_id" in data
    
    def test_verify_invalid_token(self, client):
        """Test verification with invalid token"""
        response = client.get(
            "/verify",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "auth-service"

