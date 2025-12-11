from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.exc import SQLAlchemyError
from jose import JWTError, jwt
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx
import traceback

app = FastAPI(title="Booking Service", version="1.0.0")

# CORS configuration - должно быть ПЕРВЫМ middleware
# Явно указываем origin для разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],  # Разрешаем frontend и все остальное
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Глобальный обработчик исключений для обеспечения CORS заголовков даже при ошибках
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Обработчик всех исключений, гарантирующий наличие CORS заголовков"""
    print(f"Global exception handler: {type(exc).__name__}: {str(exc)}")
    print(traceback.format_exc())
    
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    
    if isinstance(exc, SQLAlchemyError):
        return JSONResponse(
            status_code=500,
            content={"detail": "Database error occurred"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
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


# Database Models
class Booking(Base):
    __tablename__ = "bookings"
    # Указываем, что таблица уже существует и не нужно пытаться её создавать
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    # Foreign key уже существует в базе данных, поэтому не указываем его в модели
    # Это предотвращает ошибки при обращении к модели
    user_id = Column(Integer, nullable=False)
    flight_id = Column(Integer, nullable=False)
    seat_number = Column(String(10), nullable=False)
    booking_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="confirmed")


# Pydantic Models
class BookingCreate(BaseModel):
    flight_id: int
    seat_number: str


class BookingResponse(BaseModel):
    id: int
    user_id: int
    flight_id: int
    seat_number: str
    booking_date: datetime
    status: str

    class Config:
        from_attributes = True


class FlightInfo(BaseModel):
    id: int
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    available_seats: int
    total_seats: int
    price: float


class BookingWithFlight(BookingResponse):
    flight: Optional[FlightInfo] = None


# Helper functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return user info"""
    try:
        # HTTPBearer автоматически извлекает токен из заголовка Authorization
        # и убирает префикс "Bearer ", так что credentials.credentials уже чистый токен
        token = credentials.credentials
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token not provided"
            )
        
        print(f"Verifying token: {token[:20]}...")  # Логируем первые 20 символов для отладки
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id_raw = payload.get("sub")
        
        if user_id_raw is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: user_id not found"
            )
        
        # Конвертируем user_id в int (может быть строкой или числом)
        try:
            user_id = int(user_id_raw) if isinstance(user_id_raw, str) else user_id_raw
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: user_id must be int or string, got {type(user_id_raw)}"
            )
        
        print(f"Token verified successfully for user_id: {user_id}")
        return {"user_id": user_id}
        
    except JWTError as e:
        print(f"JWT Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except HTTPException:
        raise  # Пробрасываем HTTPException как есть
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )


def get_flight_info(db: Session, flight_id: int):
    """Get flight information from database"""
    from sqlalchemy import text
    result = db.execute(
        text("""
            SELECT id, flight_number, origin, destination, 
                   departure_time, arrival_time, total_seats, available_seats, price
            FROM flights WHERE id = :flight_id
        """),
        {"flight_id": flight_id}
    )
    row = result.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "flight_number": row[1],
        "origin": row[2],
        "destination": row[3],
        "departure_time": row[4],
        "arrival_time": row[5],
        "total_seats": row[6],
        "available_seats": row[7],
        "price": float(row[8]) if row[8] else 0.0
    }


# Routes
# Маппинг русских названий городов на названия в базе данных
CITY_NAME_MAPPING = {
    # Русские -> База данных
    'кишинев': 'Chișinău',
    'кишинеу': 'Chișinău',
    'кишинева': 'Chișinău',
    'кишиневе': 'Chișinău',
    'chisinau': 'Chișinău',
    'chishinau': 'Chișinău',
    'париж': 'Paris',
    'paris': 'Paris',
    'москва': 'Moscova',
    'moscow': 'Moscova',
    'moscova': 'Moscova',
    'бухарест': 'București',
    'bucharest': 'București',
    'bucuresti': 'București',
    'истанбул': 'Istanbul',
    'istanbul': 'Istanbul',
    'лондон': 'London',
    'london': 'London',
    'милан': 'Milano',
    'милано': 'Milano',
    'milano': 'Milano',
    'milan': 'Milano',
    'вена': 'Viena',
    'viena': 'Viena',
    'vienna': 'Viena',
    'прага': 'Praga',
    'praga': 'Praga',
    'prague': 'Praga',
    'берлин': 'Berlin',
    'berlin': 'Berlin',
}

def normalize_city_name(city_name: str) -> str:
    """Нормализует название города для поиска"""
    if not city_name:
        return ""
    
    city_lower = city_name.strip().lower()
    # Проверяем маппинг
    if city_lower in CITY_NAME_MAPPING:
        return CITY_NAME_MAPPING[city_lower]
    
    # Возвращаем оригинальное название (может быть уже правильным)
    return city_name.strip()

@app.get("/flights", response_model=List[FlightInfo])
async def get_available_flights(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    departure_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get available flights with optional filters"""
    from sqlalchemy import text
    from datetime import datetime, date
    
    query = """
        SELECT id, flight_number, origin, destination, 
               departure_time, arrival_time, total_seats, available_seats, price
        FROM flights
        WHERE available_seats > 0
    """
    params = {}
    
    # Если дата выбрана, фильтруем по дате
    # Если дата не выбрана, показываем все доступные рейсы
    
    if origin:
        # Нормализуем название города (русские -> названия в базе)
        origin_normalized = normalize_city_name(origin)
        origin_clean = origin.strip()
        
        # Используем функцию для нормализации диакритики через translate
        query += """ AND (
            origin ILIKE :origin 
            OR origin ILIKE :origin_normalized
            OR translate(lower(origin), 'ăâîșțĂÂÎȘȚ', 'aais tAAIST') ILIKE translate(lower(:origin_translate), 'ăâîșțĂÂÎȘȚ', 'aais tAAIST')
        )"""
        params["origin"] = f"%{origin_clean}%"
        params["origin_normalized"] = f"%{origin_normalized}%"
        params["origin_translate"] = f"%{origin_clean}%"
    
    if destination:
        # Нормализуем название города (русские -> названия в базе)
        destination_normalized = normalize_city_name(destination)
        destination_clean = destination.strip()
        
        query += """ AND (
            destination ILIKE :destination 
            OR destination ILIKE :destination_normalized
            OR translate(lower(destination), 'ăâîșțĂÂÎȘȚ', 'aais tAAIST') ILIKE translate(lower(:destination_translate), 'ăâîșțĂÂÎȘȚ', 'aais tAAIST')
        )"""
        params["destination"] = f"%{destination_clean}%"
        params["destination_normalized"] = f"%{destination_normalized}%"
        params["destination_translate"] = f"%{destination_clean}%"
    
    if departure_date:
        # Фильтрация по дате вылета
        try:
            # Парсим дату и добавляем фильтр
            date_obj = datetime.strptime(departure_date, "%Y-%m-%d").date()
            query += " AND DATE(departure_time) = :departure_date"
            params["departure_date"] = date_obj
        except ValueError:
            # Если дата невалидна, игнорируем фильтр
            pass
    
    query += " ORDER BY departure_time"
    
    result = db.execute(text(query), params)
    flights = []
    for row in result:
        flights.append(FlightInfo(
            id=row[0],
            flight_number=row[1],
            origin=row[2],
            destination=row[3],
            departure_time=row[4],
            arrival_time=row[5],
            total_seats=row[6],
            available_seats=row[7],
            price=float(row[8]) if row[8] else 0.0
        ))
    return flights


@app.get("/flights/{flight_id}", response_model=FlightInfo)
async def get_flight(flight_id: int, db: Session = Depends(get_db)):
    """Get specific flight details"""
    flight = get_flight_info(db, flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flight not found"
        )
    return FlightInfo(**flight)


@app.get("/flights/{flight_id}/booked-seats")
async def get_booked_seats(flight_id: int, db: Session = Depends(get_db)):
    """Get all booked seats for a flight"""
    from sqlalchemy import text
    result = db.execute(
        text("""
            SELECT seat_number 
            FROM bookings 
            WHERE flight_id = :flight_id AND status = 'confirmed'
        """),
        {"flight_id": flight_id}
    )
    seats = [row[0] for row in result]
    return {"booked_seats": seats}


@app.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a new booking"""
    user_info = await verify_token(credentials)
    user_id = user_info["user_id"]
    
    # Check if flight exists and has available seats
    flight = get_flight_info(db, booking_data.flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flight not found"
        )
    
    if flight["available_seats"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No available seats on this flight"
        )
    
    # Check if seat is already booked
    existing_booking = db.query(Booking).filter(
        Booking.flight_id == booking_data.flight_id,
        Booking.seat_number == booking_data.seat_number
    ).first()
    
    if existing_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seat already booked"
        )
    
    # Create booking
    new_booking = Booking(
        user_id=user_id,
        flight_id=booking_data.flight_id,
        seat_number=booking_data.seat_number,
        status="confirmed"
    )
    db.add(new_booking)
    
    # Update available seats
    from sqlalchemy import text
    db.execute(
        text("UPDATE flights SET available_seats = available_seats - 1 WHERE id = :flight_id"),
        {"flight_id": booking_data.flight_id}
    )
    
    db.commit()
    db.refresh(new_booking)
    
    # Send email notification (async, don't fail if notification fails)
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{NOTIFICATION_SERVICE_URL}/notify-booking-internal",
                json={
                    "user_id": user_id,
                    "flight_number": flight["flight_number"],
                    "origin": flight["origin"],
                    "destination": flight["destination"],
                    "departure_time": flight["departure_time"].isoformat() if isinstance(flight["departure_time"], datetime) else str(flight["departure_time"]),
                    "seat_number": booking_data.seat_number
                },
                timeout=5.0
            )
    except Exception as e:
        print(f"Failed to send booking notification: {e}")
        # Don't fail the booking if notification fails
    
    return BookingResponse(
        id=new_booking.id,
        user_id=new_booking.user_id,
        flight_id=new_booking.flight_id,
        seat_number=new_booking.seat_number,
        booking_date=new_booking.booking_date,
        status=new_booking.status
    )


@app.get("/bookings", response_model=List[BookingWithFlight])
async def get_my_bookings(
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get all bookings for current user"""
    user_id = user_info["user_id"]
    
    bookings = db.query(Booking).filter(Booking.user_id == user_id).all()
    result = []
    
    for booking in bookings:
        flight = get_flight_info(db, booking.flight_id)
        booking_response = BookingResponse(
            id=booking.id,
            user_id=booking.user_id,
            flight_id=booking.flight_id,
            seat_number=booking.seat_number,
            booking_date=booking.booking_date,
            status=booking.status
        )
        result.append(BookingWithFlight(
            **booking_response.dict(),
            flight=FlightInfo(**flight) if flight else None
        ))
    
    return result


@app.get("/bookings/{booking_id}", response_model=BookingWithFlight)
async def get_booking(
    booking_id: int,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get specific booking details"""
    user_id = user_info["user_id"]
    
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == user_id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    flight = get_flight_info(db, booking.flight_id)
    booking_response = BookingResponse(
        id=booking.id,
        user_id=booking.user_id,
        flight_id=booking.flight_id,
        seat_number=booking.seat_number,
        booking_date=booking.booking_date,
        status=booking.status
    )
    
    return BookingWithFlight(
        **booking_response.dict(),
        flight=FlightInfo(**flight) if flight else None
    )


@app.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_booking(
    booking_id: int,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Cancel a booking"""
    user_id = user_info["user_id"]
    
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == user_id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Get flight info for notification before cancellation
    flight = get_flight_info(db, booking.flight_id)
    
    # Update flight available seats
    from sqlalchemy import text
    db.execute(
        text("UPDATE flights SET available_seats = available_seats + 1 WHERE id = :flight_id"),
        {"flight_id": booking.flight_id}
    )
    
    booking.status = "cancelled"
    db.commit()
    
    # Send email notification (async, don't fail if notification fails)
    if flight:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{NOTIFICATION_SERVICE_URL}/notify-booking-cancelled",
                    json={
                        "user_id": user_id,
                        "booking_id": booking_id,
                        "flight_number": flight["flight_number"],
                        "origin": flight["origin"],
                        "destination": flight["destination"],
                        "departure_time": flight["departure_time"].isoformat() if isinstance(flight["departure_time"], datetime) else str(flight["departure_time"])
                    },
                    timeout=5.0
                )
        except Exception as e:
            print(f"Failed to send booking cancellation notification: {e}")
            # Don't fail the cancellation if notification fails
    
    return None


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "booking-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

