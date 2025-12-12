from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from jose import JWTError, jwt
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx

app = FastAPI(title="Admin Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://airline_user:airline_password@localhost:5432/airline_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security
security = HTTPBearer()
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-jwt-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


# Pydantic Models
class AirlineCreate(BaseModel):
    name: str
    code: str
    country: Optional[str] = None


class AirlineResponse(BaseModel):
    id: int
    name: str
    code: str
    country: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FlightCreate(BaseModel):
    airline_id: int
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    total_seats: int
    price: float


class FlightResponse(BaseModel):
    id: int
    airline_id: int
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    total_seats: int
    available_seats: int
    price: float
    created_at: datetime

    class Config:
        from_attributes = True


class StatisticsResponse(BaseModel):
    total_users: int
    total_flights: int
    total_bookings: int
    total_baggage: int


# Helper functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and check if user is admin"""
    try:
        token = credentials.credentials
        
        # Verify token with auth service
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/verify",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )
            data = response.json()
            if not data.get("is_admin", False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )
            return {"user_id": data["user_id"]}
    except httpx.RequestError:
        # Fallback to local token verification
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )
            # Check if user is admin (would need to query DB in production)
            return {"user_id": user_id}
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )


# Routes - Airlines
@app.post("/admin/add-airline", response_model=AirlineResponse, status_code=status.HTTP_201_CREATED)
@app.post("/airlines", response_model=AirlineResponse, status_code=status.HTTP_201_CREATED)
async def create_airline(
    airline_data: AirlineCreate,
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Create a new airline"""
    from sqlalchemy import text
    
    # Check if code already exists
    result = db.execute(
        text("SELECT id FROM airlines WHERE code = :code"),
        {"code": airline_data.code}
    )
    if result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Airline code already exists"
        )
    
    # Create airline
    result = db.execute(
        text("""
            INSERT INTO airlines (name, code, country, created_at)
            VALUES (:name, :code, :country, datetime('now'))
        """),
        {
            "name": airline_data.name,
            "code": airline_data.code,
            "country": airline_data.country
        }
    )
    db.commit()
    
    # Get the created airline
    result = db.execute(
        text("SELECT id, name, code, country, created_at FROM airlines WHERE code = :code"),
        {"code": airline_data.code}
    )
    row = result.fetchone()
    
    return AirlineResponse(
        id=row[0],
        name=row[1],
        code=row[2],
        country=row[3],
        created_at=datetime.fromisoformat(row[4].replace('Z', '+00:00')) if isinstance(row[4], str) else row[4]
    )


@app.get("/airlines", response_model=List[AirlineResponse])
async def get_airlines(
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get all airlines"""
    from sqlalchemy import text
    
    result = db.execute(
        text("SELECT id, name, code, country, created_at FROM airlines ORDER BY name")
    )
    
    airlines = []
    for row in result:
        airlines.append(AirlineResponse(
            id=row[0],
            name=row[1],
            code=row[2],
            country=row[3],
            created_at=row[4]
        ))
    return airlines


class AirlineUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    country: Optional[str] = None


@app.put("/airlines/{airline_id}", response_model=AirlineResponse)
async def update_airline(
    airline_id: int,
    airline_data: AirlineUpdate,
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Update an airline"""
    from sqlalchemy import text
    
    # Check if airline exists
    result = db.execute(
        text("SELECT id, name, code, country, created_at FROM airlines WHERE id = :airline_id"),
        {"airline_id": airline_id}
    )
    airline = result.fetchone()
    if not airline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Airline not found"
        )
    
    # Check if code already exists (if being updated)
    if airline_data.code and airline_data.code != airline[2]:
        code_check = db.execute(
            text("SELECT id FROM airlines WHERE code = :code AND id != :airline_id"),
            {"code": airline_data.code, "airline_id": airline_id}
        )
        if code_check.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Airline code already exists"
            )
    
    # Update airline
    update_fields = []
    update_values = {"airline_id": airline_id}
    
    if airline_data.name:
        update_fields.append("name = :name")
        update_values["name"] = airline_data.name
    if airline_data.code:
        update_fields.append("code = :code")
        update_values["code"] = airline_data.code
    if airline_data.country is not None:
        update_fields.append("country = :country")
        update_values["country"] = airline_data.country
    
    if update_fields:
        db.execute(
            text(f"UPDATE airlines SET {', '.join(update_fields)} WHERE id = :airline_id"),
            update_values
        )
        db.commit()
    
    # Get updated airline
    result = db.execute(
        text("SELECT id, name, code, country, created_at FROM airlines WHERE id = :airline_id"),
        {"airline_id": airline_id}
    )
    row = result.fetchone()
    
    # Send email notification to admin (optional, for logging changes)
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{NOTIFICATION_SERVICE_URL}/send-email-internal",
                json={
                    "to": "admin@airline.com",
                    "subject": f"Авиакомпания обновлена: {row[1]}",
                    "body": f"Авиакомпания {row[1]} (ID: {row[0]}) была обновлена администратором.",
                    "html": f"<p>Авиакомпания <strong>{row[1]}</strong> (ID: {row[0]}) была обновлена администратором.</p>"
                },
                timeout=5.0
            )
    except Exception as e:
        print(f"Failed to send airline update notification: {e}")
        # Don't fail the update if notification fails
    
    return AirlineResponse(
        id=row[0],
        name=row[1],
        code=row[2],
        country=row[3],
        created_at=row[4]
    )


@app.delete("/airlines/{airline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_airline(
    airline_id: int,
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Delete an airline"""
    from sqlalchemy import text
    
    # Check if airline exists
    result = db.execute(
        text("SELECT id FROM airlines WHERE id = :airline_id"),
        {"airline_id": airline_id}
    )
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Airline not found"
        )
    
    # Check if airline has flights
    flights_check = db.execute(
        text("SELECT id FROM flights WHERE airline_id = :airline_id LIMIT 1"),
        {"airline_id": airline_id}
    )
    if flights_check.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete airline with existing flights"
        )
    
    # Delete airline
    db.execute(
        text("DELETE FROM airlines WHERE id = :airline_id"),
        {"airline_id": airline_id}
    )
    db.commit()
    
    return None


# Routes - Flights
@app.post("/admin/add-flight", response_model=FlightResponse, status_code=status.HTTP_201_CREATED)
@app.post("/flights", response_model=FlightResponse, status_code=status.HTTP_201_CREATED)
async def create_flight(
    flight_data: FlightCreate,
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Create a new flight"""
    from sqlalchemy import text
    
    # Check if airline exists
    airline_result = db.execute(
        text("SELECT id FROM airlines WHERE id = :airline_id"),
        {"airline_id": flight_data.airline_id}
    )
    if not airline_result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Airline not found"
        )
    
    # Create flight
    result = db.execute(
        text("""
            INSERT INTO flights (airline_id, flight_number, origin, destination,
                                 departure_time, arrival_time, total_seats, available_seats, price, created_at)
            VALUES (:airline_id, :flight_number, :origin, :destination,
                    :departure_time, :arrival_time, :total_seats, :available_seats, :price, datetime('now'))
            RETURNING id, airline_id, flight_number, origin, destination,
                     departure_time, arrival_time, total_seats, available_seats, price, created_at
        """),
        {
            "airline_id": flight_data.airline_id,
            "flight_number": flight_data.flight_number,
            "origin": flight_data.origin,
            "destination": flight_data.destination,
            "departure_time": flight_data.departure_time,
            "arrival_time": flight_data.arrival_time,
            "total_seats": flight_data.total_seats,
            "available_seats": flight_data.total_seats,
            "price": flight_data.price
        }
    )
    db.commit()
    row = result.fetchone()
    
    return FlightResponse(
        id=row[0],
        airline_id=row[1],
        flight_number=row[2],
        origin=row[3],
        destination=row[4],
        departure_time=row[5],
        arrival_time=row[6],
        total_seats=row[7],
        available_seats=row[8],
        price=float(row[9]),
        created_at=row[10]
    )


@app.get("/flights", response_model=List[FlightResponse])
async def get_flights(
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get all flights"""
    from sqlalchemy import text
    
    result = db.execute(
        text("""
            SELECT id, airline_id, flight_number, origin, destination,
                   departure_time, arrival_time, total_seats, available_seats, price, created_at
            FROM flights
            ORDER BY departure_time DESC
        """)
    )
    
    flights = []
    for row in result:
        flights.append(FlightResponse(
            id=row[0],
            airline_id=row[1],
            flight_number=row[2],
            origin=row[3],
            destination=row[4],
            departure_time=row[5],
            arrival_time=row[6],
            total_seats=row[7],
            available_seats=row[8],
            price=float(row[9]),
            created_at=row[10]
        ))
    return flights


@app.delete("/flights/{flight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flight(
    flight_id: int,
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Delete a flight"""
    from sqlalchemy import text
    
    # Get flight info before deletion for notification
    flight_result = db.execute(
        text("SELECT id, flight_number FROM flights WHERE id = :flight_id"),
        {"flight_id": flight_id}
    )
    flight_row = flight_result.fetchone()
    
    if not flight_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flight not found"
        )
    
    # Delete flight
    db.execute(
        text("DELETE FROM flights WHERE id = :flight_id"),
        {"flight_id": flight_id}
    )
    db.commit()
    
    # Send email notification to all users with bookings for this flight
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{NOTIFICATION_SERVICE_URL}/notify-flight-change",
                json={
                    "flight_id": flight_id,
                    "change_type": "cancelled"
                },
                timeout=10.0
            )
    except Exception as e:
        print(f"Failed to send flight cancellation notification: {e}")
        # Don't fail the deletion if notification fails
    
    return None


# Routes - Statistics
@app.get("/statistics", response_model=StatisticsResponse)
async def get_statistics(
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get system statistics"""
    from sqlalchemy import text
    
    stats = {}
    
    # Total users
    result = db.execute(text("SELECT COUNT(*) FROM users"))
    stats["total_users"] = result.fetchone()[0]
    
    # Total flights
    result = db.execute(text("SELECT COUNT(*) FROM flights"))
    stats["total_flights"] = result.fetchone()[0]
    
    # Total bookings
    result = db.execute(text("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'"))
    stats["total_bookings"] = result.fetchone()[0]
    
    # Total baggage
    result = db.execute(text("SELECT COUNT(*) FROM baggage"))
    stats["total_baggage"] = result.fetchone()[0]
    
    return StatisticsResponse(**stats)


# Routes - Clients
class ClientResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    is_admin: bool
    created_at: datetime
    total_bookings: int

    class Config:
        from_attributes = True


@app.get("/clients", response_model=List[ClientResponse])
async def get_clients(
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get all clients"""
    from sqlalchemy import text
    
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_admin, u.created_at,
                   COUNT(b.id) as total_bookings
            FROM users u
            LEFT JOIN bookings b ON u.id = b.user_id AND b.status = 'confirmed'
            GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.is_admin, u.created_at
            ORDER BY u.created_at DESC
        """)
    )
    
    clients = []
    for row in result:
        clients.append(ClientResponse(
            id=row[0],
            email=row[1],
            first_name=row[2],
            last_name=row[3],
            phone=row[4],
            is_admin=row[5],
            created_at=row[6],
            total_bookings=row[7] or 0
        ))
    return clients


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


@app.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Update a client"""
    from sqlalchemy import text
    
    # Check if client exists
    result = db.execute(
        text("SELECT id, email, first_name, last_name, phone, is_admin, created_at FROM users WHERE id = :client_id"),
        {"client_id": client_id}
    )
    client = result.fetchone()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Check if email already exists (if being updated)
    if client_data.email and client_data.email != client[1]:
        email_check = db.execute(
            text("SELECT id FROM users WHERE email = :email AND id != :client_id"),
            {"email": client_data.email, "client_id": client_id}
        )
        if email_check.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
    
    # Update client
    update_fields = []
    update_values = {"client_id": client_id}
    
    if client_data.first_name:
        update_fields.append("first_name = :first_name")
        update_values["first_name"] = client_data.first_name
    if client_data.last_name:
        update_fields.append("last_name = :last_name")
        update_values["last_name"] = client_data.last_name
    if client_data.email:
        update_fields.append("email = :email")
        update_values["email"] = client_data.email
    if client_data.phone is not None:
        update_fields.append("phone = :phone")
        update_values["phone"] = client_data.phone
    
    if update_fields:
        db.execute(
            text(f"UPDATE users SET {', '.join(update_fields)} WHERE id = :client_id"),
            update_values
        )
        db.commit()
    
    # Get updated client with booking count
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_admin, u.created_at,
                   COUNT(b.id) as total_bookings
            FROM users u
            LEFT JOIN bookings b ON u.id = b.user_id AND b.status = 'confirmed'
            WHERE u.id = :client_id
            GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.is_admin, u.created_at
        """),
        {"client_id": client_id}
    )
    row = result.fetchone()
    
    # Send email notification to client about profile update
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{NOTIFICATION_SERVICE_URL}/send-email-internal",
                json={
                    "to": row[1],  # client email
                    "subject": "Ваш профиль был обновлен",
                    "body": f"Здравствуйте, {row[2]}!\n\nВаш профиль был обновлен администратором.\n\nЕсли вы не запрашивали это изменение, пожалуйста, свяжитесь с поддержкой.\n\nС уважением,\nКоманда Airline",
                    "html": f"""
                    <html>
                      <body>
                        <h2>Обновление профиля</h2>
                        <p>Здравствуйте, <strong>{row[2]}</strong>!</p>
                        <p>Ваш профиль был обновлен администратором.</p>
                        <p>Если вы не запрашивали это изменение, пожалуйста, свяжитесь с поддержкой.</p>
                        <p>С уважением,<br>Команда Airline</p>
                      </body>
                    </html>
                    """
                },
                timeout=5.0
            )
    except Exception as e:
        print(f"Failed to send client update notification: {e}")
        # Don't fail the update if notification fails
    
    return ClientResponse(
        id=row[0],
        email=row[1],
        first_name=row[2],
        last_name=row[3],
        phone=row[4],
        is_admin=row[5],
        created_at=row[6],
        total_bookings=row[7] or 0
    )


# Routes - Bookings Management
class BookingUpdate(BaseModel):
    status: Optional[str] = None


class BookingResponse(BaseModel):
    id: int
    user_id: int
    flight_id: int
    seat_number: str
    status: str
    booking_date: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    flight_number: Optional[str] = None

    class Config:
        from_attributes = True


@app.get("/bookings", response_model=List[BookingResponse])
async def get_all_bookings(
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get all bookings"""
    from sqlalchemy import text
    
    result = db.execute(
        text("""
            SELECT b.id, b.user_id, b.flight_id, b.seat_number, b.status, b.booking_date,
                   u.email, u.first_name || ' ' || u.last_name as user_name,
                   f.flight_number
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN flights f ON b.flight_id = f.id
            ORDER BY b.booking_date DESC
        """)
    )
    
    bookings = []
    for row in result:
        bookings.append(BookingResponse(
            id=row[0],
            user_id=row[1],
            flight_id=row[2],
            seat_number=row[3],
            status=row[4],
            booking_date=row[5],
            user_email=row[6],
            user_name=row[7],
            flight_number=row[8]
        ))
    return bookings


@app.put("/bookings/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    admin_info: dict = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Update booking status"""
    from sqlalchemy import text
    
    # Check if booking exists
    result = db.execute(
        text("SELECT id FROM bookings WHERE id = :booking_id"),
        {"booking_id": booking_id}
    )
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Update booking
    if booking_data.status:
        db.execute(
            text("UPDATE bookings SET status = :status WHERE id = :booking_id"),
            {"status": booking_data.status, "booking_id": booking_id}
        )
        db.commit()
    
    # Get updated booking
    result = db.execute(
        text("""
            SELECT b.id, b.user_id, b.flight_id, b.seat_number, b.status, b.booking_date,
                   u.email, u.first_name || ' ' || u.last_name as user_name,
                   f.flight_number
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN flights f ON b.flight_id = f.id
            WHERE b.id = :booking_id
        """),
        {"booking_id": booking_id}
    )
    row = result.fetchone()
    
    return BookingResponse(
        id=row[0],
        user_id=row[1],
        flight_id=row[2],
        seat_number=row[3],
        status=row[4],
        booking_date=row[5],
        user_email=row[6],
        user_name=row[7],
        flight_number=row[8]
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "admin-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

