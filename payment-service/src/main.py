from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Numeric, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from jose import JWTError, jwt
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx
import uuid

app = FastAPI(title="Payment Service", version="1.0.0")

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

# Создаем таблицы при старте (если их еще нет)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Note: Tables may already exist: {e}")

# Security
security = HTTPBearer()
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000")
BOOKING_SERVICE_URL = os.getenv("BOOKING_SERVICE_URL", "http://booking-service:8000")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-jwt-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


# Database Models
class Payment(Base):
    __tablename__ = "payments"
    # Указываем, что таблица уже существует или будет создана
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    # Foreign key уже существует в базе данных, поэтому не указываем его в модели
    booking_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    payment_id = Column(String(100), unique=True, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    payment_method = Column(String(50), nullable=False)  # card, paypal, etc.
    status = Column(String(20), default="pending")  # pending, completed, failed, refunded
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    refund_id = Column(String(100), nullable=True)


# Pydantic Models
class PaymentCreate(BaseModel):
    booking_id: int
    payment_method: str
    amount: float
    currency: Optional[str] = "USD"


class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    user_id: int
    payment_id: str
    amount: float
    currency: str
    payment_method: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    refund_id: Optional[str] = None

    class Config:
        from_attributes = True


class RefundRequest(BaseModel):
    payment_id: str
    reason: Optional[str] = None


class RefundResponse(BaseModel):
    payment_id: str
    refund_id: str
    amount: float
    status: str
    message: str


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
        token = credentials.credentials
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
        return {"user_id": user_id}
    except JWTError as e:
        print(f"JWT Error in payment-service: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


def check_booking_ownership(db: Session, booking_id: int, user_id: int) -> bool:
    """Check if booking belongs to user"""
    from sqlalchemy import text
    result = db.execute(
        text("SELECT user_id FROM bookings WHERE id = :booking_id"),
        {"booking_id": booking_id}
    )
    row = result.fetchone()
    return row and row[0] == user_id


def get_booking_price(db: Session, booking_id: int) -> Optional[float]:
    """Get booking price from flight"""
    from sqlalchemy import text
    result = db.execute(
        text("""
            SELECT f.price 
            FROM flights f
            JOIN bookings b ON f.id = b.flight_id
            WHERE b.id = :booking_id
        """),
        {"booking_id": booking_id}
    )
    row = result.fetchone()
    return float(row[0]) if row and row[0] else None


# Routes
@app.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Create a payment for a booking"""
    user_id = user_info["user_id"]
    
    # Check if booking exists and belongs to user
    if not check_booking_ownership(db, payment_data.booking_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or does not belong to you"
        )
    
    # Check if payment already exists for this booking
    from sqlalchemy import text
    existing = db.execute(
        text("SELECT id FROM payments WHERE booking_id = :booking_id AND status = 'completed'"),
        {"booking_id": payment_data.booking_id}
    ).fetchone()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already completed for this booking"
        )
    
    # Get booking price
    booking_price = get_booking_price(db, payment_data.booking_id)
    if not booking_price:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flight price not found"
        )
    
    # Validate amount
    if abs(payment_data.amount - booking_price) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Amount mismatch. Expected: {booking_price}, Got: {payment_data.amount}"
        )
    
    # Generate payment ID
    payment_id = f"PAY-{uuid.uuid4().hex[:12].upper()}"
    
    # Create payment record
    new_payment = Payment(
        booking_id=payment_data.booking_id,
        user_id=user_id,
        payment_id=payment_id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        payment_method=payment_data.payment_method,
        status="pending"
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    
    # Simulate payment processing (in production, integrate with payment gateway)
    # For demo purposes, auto-complete payment
    new_payment.status = "completed"
    new_payment.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(new_payment)
    
    # Get flight information for notification
    from sqlalchemy import text
    flight_result = db.execute(
        text("""
            SELECT f.flight_number, f.origin, f.destination
            FROM flights f
            JOIN bookings b ON f.id = b.flight_id
            WHERE b.id = :booking_id
        """),
        {"booking_id": payment_data.booking_id}
    )
    flight_row = flight_result.fetchone()
    
    # Send email notification (async, don't fail if notification fails)
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{NOTIFICATION_SERVICE_URL}/notify-payment",
                json={
                    "user_id": user_id,
                    "payment_id": payment_id,
                    "amount": float(payment_data.amount),
                    "currency": payment_data.currency,
                    "payment_method": payment_data.payment_method,
                    "booking_id": payment_data.booking_id,
                    "flight_number": flight_row[0] if flight_row else None,
                    "origin": flight_row[1] if flight_row else None,
                    "destination": flight_row[2] if flight_row else None
                },
                timeout=5.0
            )
    except Exception as e:
        print(f"Failed to send payment notification: {e}")
        # Don't fail the payment if notification fails
    
    return PaymentResponse(
        id=new_payment.id,
        booking_id=new_payment.booking_id,
        user_id=new_payment.user_id,
        payment_id=new_payment.payment_id,
        amount=float(new_payment.amount),
        currency=new_payment.currency,
        payment_method=new_payment.payment_method,
        status=new_payment.status,
        created_at=new_payment.created_at,
        completed_at=new_payment.completed_at,
        refund_id=new_payment.refund_id
    )


@app.get("/payments", response_model=List[PaymentResponse])
async def get_my_payments(
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get all payments for current user"""
    user_id = user_info["user_id"]
    
    payments = db.query(Payment).filter(Payment.user_id == user_id).order_by(Payment.created_at.desc()).all()
    
    return [
        PaymentResponse(
            id=p.id,
            booking_id=p.booking_id,
            user_id=p.user_id,
            payment_id=p.payment_id,
            amount=float(p.amount),
            currency=p.currency,
            payment_method=p.payment_method,
            status=p.status,
            created_at=p.created_at,
            completed_at=p.completed_at,
            refund_id=p.refund_id
        )
        for p in payments
    ]


@app.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get specific payment details"""
    user_id = user_info["user_id"]
    
    payment = db.query(Payment).filter(
        Payment.payment_id == payment_id,
        Payment.user_id == user_id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return PaymentResponse(
        id=payment.id,
        booking_id=payment.booking_id,
        user_id=payment.user_id,
        payment_id=payment.payment_id,
        amount=float(payment.amount),
        currency=payment.currency,
        payment_method=payment.payment_method,
        status=payment.status,
        created_at=payment.created_at,
        completed_at=payment.completed_at,
        refund_id=payment.refund_id
    )


@app.post("/payments/{payment_id}/refund", response_model=RefundResponse)
async def refund_payment(
    payment_id: str,
    refund_data: RefundRequest,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Process a refund for a payment"""
    user_id = user_info["user_id"]
    
    payment = db.query(Payment).filter(
        Payment.payment_id == payment_id,
        Payment.user_id == user_id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed payments can be refunded"
        )
    
    if payment.status == "refunded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already refunded"
        )
    
    # Generate refund ID
    refund_id = f"REF-{uuid.uuid4().hex[:12].upper()}"
    
    # Update payment status
    payment.status = "refunded"
    payment.refund_id = refund_id
    db.commit()
    db.refresh(payment)
    
    # In production, integrate with payment gateway to process refund
    # For demo, we just update the status
    
    return RefundResponse(
        payment_id=payment.payment_id,
        refund_id=refund_id,
        amount=float(payment.amount),
        status="refunded",
        message="Refund processed successfully"
    )


@app.get("/payments/booking/{booking_id}", response_model=Optional[PaymentResponse])
async def get_payment_by_booking(
    booking_id: int,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get payment for a specific booking"""
    user_id = user_info["user_id"]
    
    # Check if booking belongs to user
    if not check_booking_ownership(db, booking_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or does not belong to you"
        )
    
    payment = db.query(Payment).filter(
        Payment.booking_id == booking_id,
        Payment.user_id == user_id
    ).order_by(Payment.created_at.desc()).first()
    
    if not payment:
        return None
    
    return PaymentResponse(
        id=payment.id,
        booking_id=payment.booking_id,
        user_id=payment.user_id,
        payment_id=payment.payment_id,
        amount=float(payment.amount),
        currency=payment.currency,
        payment_method=payment.payment_method,
        status=payment.status,
        created_at=payment.created_at,
        completed_at=payment.completed_at,
        refund_id=payment.refund_id
    )


@app.get("/payments/{payment_id}/receipt")
async def get_receipt(
    payment_id: str,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get receipt data for a payment"""
    user_id = user_info["user_id"]
    
    # Get payment
    payment = db.query(Payment).filter(
        Payment.payment_id == payment_id,
        Payment.user_id == user_id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Get booking details
    from sqlalchemy import text
    booking_result = db.execute(
        text("""
            SELECT b.id, b.seat_number, b.booking_date, b.status,
                   f.flight_number, f.origin, f.destination, 
                   f.departure_time, f.arrival_time, f.price,
                   u.first_name, u.last_name, u.email, u.phone
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN users u ON b.user_id = u.id
            WHERE b.id = :booking_id
        """),
        {"booking_id": payment.booking_id}
    )
    booking_row = booking_result.fetchone()
    
    if not booking_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    return {
        "payment": {
            "payment_id": payment.payment_id,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "payment_method": payment.payment_method,
            "status": payment.status,
            "created_at": payment.created_at.isoformat(),
            "completed_at": payment.completed_at.isoformat() if payment.completed_at else None
        },
        "booking": {
            "id": booking_row[0],
            "seat_number": booking_row[1],
            "booking_date": booking_row[2].isoformat() if booking_row[2] else None,
            "status": booking_row[3]
        },
        "flight": {
            "flight_number": booking_row[4],
            "origin": booking_row[5],
            "destination": booking_row[6],
            "departure_time": booking_row[7].isoformat() if booking_row[7] else None,
            "arrival_time": booking_row[8].isoformat() if booking_row[8] else None,
            "price": float(booking_row[9]) if booking_row[9] else 0.0
        },
        "user": {
            "first_name": booking_row[10],
            "last_name": booking_row[11],
            "email": booking_row[12],
            "phone": booking_row[13]
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "payment-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

