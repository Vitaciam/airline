from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from jose import JWTError, jwt
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx

app = FastAPI(title="Baggage Service", version="1.0.0")

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
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-jwt-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


# Database Models
class Baggage(Base):
    __tablename__ = "baggage"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, nullable=False)  # Foreign key defined in init.sql
    baggage_tag = Column(String(50), unique=True, nullable=False, index=True)
    weight = Column(Numeric(5, 2))
    status = Column(String(50), default="checked_in")
    location = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)


# Pydantic Models
class BaggageCreate(BaseModel):
    booking_id: int
    weight: Optional[float] = None


class BaggageUpdate(BaseModel):
    status: Optional[str] = None
    location: Optional[str] = None


class BaggageResponse(BaseModel):
    id: int
    booking_id: int
    baggage_tag: str
    weight: Optional[float]
    status: str
    location: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BaggageStatusResponse(BaseModel):
    baggage_tag: str
    status: str
    location: Optional[str]
    booking_id: int


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
        print(f"JWT Error in baggage-service: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


def generate_baggage_tag() -> str:
    """Generate a unique baggage tag"""
    import random
    import string
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=6))
    return f"{letters}{numbers}"


def check_booking_ownership(db: Session, booking_id: int, user_id: int) -> bool:
    """Check if booking belongs to user"""
    from sqlalchemy import text
    result = db.execute(
        text("SELECT user_id FROM bookings WHERE id = :booking_id"),
        {"booking_id": booking_id}
    )
    row = result.fetchone()
    return row and row[0] == user_id


# Routes
@app.post("/baggage", response_model=BaggageResponse, status_code=status.HTTP_201_CREATED)
async def create_baggage(
    baggage_data: BaggageCreate,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Create a new baggage record"""
    user_id = user_info["user_id"]
    
    # Check if booking exists and belongs to user
    if not check_booking_ownership(db, baggage_data.booking_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or does not belong to you"
        )
    
    # Generate unique baggage tag
    baggage_tag = generate_baggage_tag()
    
    # Check if tag is unique (very unlikely but check anyway)
    existing = db.query(Baggage).filter(Baggage.baggage_tag == baggage_tag).first()
    while existing:
        baggage_tag = generate_baggage_tag()
        existing = db.query(Baggage).filter(Baggage.baggage_tag == baggage_tag).first()
    
    # Create baggage record
    new_baggage = Baggage(
        booking_id=baggage_data.booking_id,
        baggage_tag=baggage_tag,
        weight=baggage_data.weight,
        status="checked_in",
        location="Airport Check-in"
    )
    db.add(new_baggage)
    db.commit()
    db.refresh(new_baggage)
    
    return BaggageResponse(
        id=new_baggage.id,
        booking_id=new_baggage.booking_id,
        baggage_tag=new_baggage.baggage_tag,
        weight=float(new_baggage.weight) if new_baggage.weight else None,
        status=new_baggage.status,
        location=new_baggage.location,
        created_at=new_baggage.created_at
    )


@app.get("/baggage/status/{baggage_tag}", response_model=BaggageStatusResponse)
async def get_baggage_status(
    baggage_tag: str,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get baggage status by tag"""
    user_id = user_info["user_id"]
    
    baggage = db.query(Baggage).filter(Baggage.baggage_tag == baggage_tag).first()
    if not baggage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baggage not found"
        )
    
    # Check if booking belongs to user
    if not check_booking_ownership(db, baggage.booking_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this baggage"
        )
    
    return BaggageStatusResponse(
        baggage_tag=baggage.baggage_tag,
        status=baggage.status,
        location=baggage.location,
        booking_id=baggage.booking_id
    )


@app.get("/baggage/booking/{booking_id}", response_model=List[BaggageResponse])
async def get_baggage_by_booking(
    booking_id: int,
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get all baggage for a specific booking"""
    user_id = user_info["user_id"]
    
    # Check if booking belongs to user
    if not check_booking_ownership(db, booking_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or does not belong to you"
        )
    
    baggage_list = db.query(Baggage).filter(Baggage.booking_id == booking_id).all()
    
    return [
        BaggageResponse(
            id=bg.id,
            booking_id=bg.booking_id,
            baggage_tag=bg.baggage_tag,
            weight=float(bg.weight) if bg.weight else None,
            status=bg.status,
            location=bg.location,
            created_at=bg.created_at
        )
        for bg in baggage_list
    ]


@app.get("/baggage/my", response_model=List[BaggageResponse])
async def get_my_baggage(
    user_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get all baggage for current user"""
    user_id = user_info["user_id"]
    
    from sqlalchemy import text
    result = db.execute(
        text("""
            SELECT b.id, b.booking_id, b.baggage_tag, b.weight, 
                   b.status, b.location, b.created_at
            FROM baggage b
            JOIN bookings bk ON b.booking_id = bk.id
            WHERE bk.user_id = :user_id
            ORDER BY b.created_at DESC
        """),
        {"user_id": user_id}
    )
    
    baggage_list = []
    for row in result:
        baggage_list.append(BaggageResponse(
            id=row[0],
            booking_id=row[1],
            baggage_tag=row[2],
            weight=float(row[3]) if row[3] else None,
            status=row[4],
            location=row[5],
            created_at=row[6]
        ))
    
    return baggage_list


@app.put("/baggage/{baggage_id}", response_model=BaggageResponse)
async def update_baggage(
    baggage_id: int,
    baggage_update: BaggageUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user_info = await verify_token(credentials)
    """Update baggage status (admin only in production, but simplified for demo)"""
    user_id = user_info["user_id"]
    
    baggage = db.query(Baggage).filter(Baggage.id == baggage_id).first()
    if not baggage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baggage not found"
        )
    
    # Check if booking belongs to user (or could be admin check)
    if not check_booking_ownership(db, baggage.booking_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this baggage"
        )
    
    old_status = baggage.status
    
    if baggage_update.status:
        baggage.status = baggage_update.status
    if baggage_update.location:
        baggage.location = baggage_update.location
    
    db.commit()
    db.refresh(baggage)
    
    # Send email notification if status changed
    if baggage_update.status and baggage_update.status != old_status:
        try:
            import httpx
            # Get user_id from booking
            from sqlalchemy import text
            result = db.execute(
                text("SELECT user_id FROM bookings WHERE id = :booking_id"),
                {"booking_id": baggage.booking_id}
            )
            booking_row = result.fetchone()
            if booking_row:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{NOTIFICATION_SERVICE_URL}/notify-baggage",
                        json={
                            "user_id": booking_row[0],
                            "baggage_tag": baggage.baggage_tag,
                            "status": baggage.status,
                            "location": baggage.location
                        },
                        timeout=5.0
                    )
        except Exception as e:
            print(f"Failed to send baggage notification: {e}")
            # Don't fail the update if notification fails
    
    return BaggageResponse(
        id=baggage.id,
        booking_id=baggage.booking_id,
        baggage_tag=baggage.baggage_tag,
        weight=float(baggage.weight) if baggage.weight else None,
        status=baggage.status,
        location=baggage.location,
        created_at=baggage.created_at
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "baggage-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

