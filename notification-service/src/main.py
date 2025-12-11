from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jose import JWTError, jwt

app = FastAPI(title="Notification Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup (read-only for getting user emails)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://airline_user:airline_password@localhost:5432/airline_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Security
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-jwt-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
# Remove spaces from password (Gmail app passwords can have spaces in .env file)
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip().replace(" ", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@airline.com").strip()


# Pydantic Models
class EmailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str
    html: Optional[str] = None


class BookingNotification(BaseModel):
    user_id: int
    flight_number: str
    origin: str
    destination: str
    departure_time: str
    seat_number: str


class BaggageNotification(BaseModel):
    user_id: int
    baggage_tag: str
    status: str
    location: Optional[str] = None


class PaymentNotification(BaseModel):
    user_id: int
    payment_id: str
    amount: float
    currency: str
    payment_method: str
    booking_id: int
    flight_number: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None


# Helper functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return {"user_id": user_id}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


def send_email(to_email: str, subject: str, body: str, html: Optional[str] = None) -> bool:
    """Send email via SMTP with improved error handling"""
    # Check if SMTP is configured
    if not SMTP_USER or not SMTP_PASSWORD:
        # In development, just log the email
        print(f"[EMAIL] SMTP not configured - logging email instead")
        print(f"[EMAIL] To: {to_email}")
        print(f"[EMAIL] Subject: {subject}")
        print(f"[EMAIL] Body preview: {body[:100]}...")
        return True
    
    try:
        # Password is already cleaned during initialization, but double-check
        smtp_password = SMTP_PASSWORD.replace(" ", "") if SMTP_PASSWORD else ""
        
        if not smtp_password:
            print(f"[EMAIL ERROR] SMTP_PASSWORD is empty")
            return False
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['From'] = SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add both plain text and HTML versions
        part1 = MIMEText(body, 'plain', 'utf-8')
        msg.attach(part1)
        
        if html:
            part2 = MIMEText(html, 'html', 'utf-8')
            msg.attach(part2)
        
        # Connect to SMTP server and send email
        print(f"[EMAIL] Attempting to send email to {to_email} via {SMTP_HOST}:{SMTP_PORT}")
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            # Enable debug output in development
            if os.getenv("SMTP_DEBUG", "false").lower() == "true":
                server.set_debuglevel(1)
            
            # Start TLS encryption
            server.starttls()
            
            # Login to SMTP server
            server.login(SMTP_USER, smtp_password)
            
            # Send email
            server.send_message(msg)
        
        print(f"[EMAIL] Successfully sent email to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"[EMAIL ERROR] Authentication failed: {e}")
        print(f"[EMAIL ERROR] Check your SMTP_USER and SMTP_PASSWORD")
        print(f"[EMAIL ERROR] For Gmail, make sure you're using an App Password, not your regular password")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"[EMAIL ERROR] Could not connect to SMTP server {SMTP_HOST}:{SMTP_PORT}: {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"[EMAIL ERROR] SMTP error occurred: {e}")
        return False
    except Exception as e:
        print(f"[EMAIL ERROR] Unexpected error sending email to {to_email}: {type(e).__name__}: {e}")
        import traceback
        print(f"[EMAIL ERROR] Traceback: {traceback.format_exc()}")
        return False


# Routes
@app.post("/send-email")
async def send_email_endpoint(
    email_data: EmailRequest,
    auth_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Send email notification (requires authentication)"""
    success = send_email(
        to_email=email_data.to,
        subject=email_data.subject,
        body=email_data.body,
        html=email_data.html
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return {"message": "Email sent successfully", "to": email_data.to}


@app.post("/send-email-internal")
async def send_email_internal(
    email_data: EmailRequest,
    db: Session = Depends(get_db)
):
    """Send email notification (internal service endpoint, no auth required)"""
    success = send_email(
        to_email=email_data.to,
        subject=email_data.subject,
        body=email_data.body,
        html=email_data.html
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return {"message": "Email sent successfully", "to": email_data.to}


@app.post("/notify-booking-internal")
async def notify_booking_created_internal(
    notification: BookingNotification,
    db: Session = Depends(get_db)
):
    """Send booking confirmation email (internal service endpoint, no auth required)"""
    from sqlalchemy import text
    
    # Get user email
    result = db.execute(
        text("SELECT email, first_name FROM users WHERE id = :user_id"),
        {"user_id": notification.user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    email, first_name = user
    
    # Create email content
    subject = f"Подтверждение бронирования рейса {notification.flight_number}"
    body = f"""
Здравствуйте, {first_name}!

Ваше бронирование подтверждено.

Детали рейса:
- Номер рейса: {notification.flight_number}
- Маршрут: {notification.origin} → {notification.destination}
- Дата вылета: {notification.departure_time}
- Место: {notification.seat_number}

Спасибо за выбор Airline!

С уважением,
Команда Airline
"""
    html = f"""
    <html>
      <body>
        <h2>Подтверждение бронирования</h2>
        <p>Здравствуйте, <strong>{first_name}</strong>!</p>
        <p>Ваше бронирование подтверждено.</p>
        <h3>Детали рейса:</h3>
        <ul>
          <li>Номер рейса: <strong>{notification.flight_number}</strong></li>
          <li>Маршрут: <strong>{notification.origin} → {notification.destination}</strong></li>
          <li>Дата вылета: <strong>{notification.departure_time}</strong></li>
          <li>Место: <strong>{notification.seat_number}</strong></li>
        </ul>
        <p>Спасибо за выбор Airline!</p>
        <p>С уважением,<br>Команда Airline</p>
      </body>
    </html>
    """
    
    success = send_email(to_email=email, subject=subject, body=body, html=html)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return {"message": "Booking notification sent", "to": email}


@app.post("/notify-booking")
async def notify_booking_created(
    notification: BookingNotification,
    auth_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Send booking confirmation email (requires authentication)"""
    from sqlalchemy import text
    
    # Get user email
    result = db.execute(
        text("SELECT email, first_name FROM users WHERE id = :user_id"),
        {"user_id": notification.user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    email, first_name = user
    
    # Create email content
    subject = f"Подтверждение бронирования рейса {notification.flight_number}"
    body = f"""
Здравствуйте, {first_name}!

Ваше бронирование подтверждено.

Детали рейса:
- Номер рейса: {notification.flight_number}
- Маршрут: {notification.origin} → {notification.destination}
- Дата вылета: {notification.departure_time}
- Место: {notification.seat_number}

Спасибо за выбор Airline!

С уважением,
Команда Airline
"""
    html = f"""
    <html>
      <body>
        <h2>Подтверждение бронирования</h2>
        <p>Здравствуйте, <strong>{first_name}</strong>!</p>
        <p>Ваше бронирование подтверждено.</p>
        <h3>Детали рейса:</h3>
        <ul>
          <li>Номер рейса: <strong>{notification.flight_number}</strong></li>
          <li>Маршрут: <strong>{notification.origin} → {notification.destination}</strong></li>
          <li>Дата вылета: <strong>{notification.departure_time}</strong></li>
          <li>Место: <strong>{notification.seat_number}</strong></li>
        </ul>
        <p>Спасибо за выбор Airline!</p>
        <p>С уважением,<br>Команда Airline</p>
      </body>
    </html>
    """
    
    success = send_email(to_email=email, subject=subject, body=body, html=html)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return {"message": "Booking notification sent", "to": email}


@app.post("/notify-baggage")
async def notify_baggage_status(
    notification: BaggageNotification,
    auth_info: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Send baggage status update email"""
    from sqlalchemy import text
    
    # Get user email
    result = db.execute(
        text("SELECT email, first_name FROM users WHERE id = :user_id"),
        {"user_id": notification.user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    email, first_name = user
    
    # Create email content
    status_ru = {
        "in_transit": "В пути",
        "delivered": "Доставлен",
        "lost": "Утерян"
    }.get(notification.status, notification.status)
    
    subject = f"Обновление статуса багажа {notification.baggage_tag}"
    body = f"""
Здравствуйте, {first_name}!

Статус вашего багажа обновлен.

Детали:
- Номер бирки: {notification.baggage_tag}
- Статус: {status_ru}
- Местоположение: {notification.location or 'Не указано'}

С уважением,
Команда Airline
"""
    html = f"""
    <html>
      <body>
        <h2>Обновление статуса багажа</h2>
        <p>Здравствуйте, <strong>{first_name}</strong>!</p>
        <p>Статус вашего багажа обновлен.</p>
        <h3>Детали:</h3>
        <ul>
          <li>Номер бирки: <strong>{notification.baggage_tag}</strong></li>
          <li>Статус: <strong>{status_ru}</strong></li>
          <li>Местоположение: <strong>{notification.location or 'Не указано'}</strong></li>
        </ul>
        <p>С уважением,<br>Команда Airline</p>
      </body>
    </html>
    """
    
    success = send_email(to_email=email, subject=subject, body=body, html=html)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return {"message": "Baggage notification sent", "to": email}


@app.post("/notify-payment")
async def notify_payment_completed(
    notification: PaymentNotification,
    db: Session = Depends(get_db)
):
    """Send payment confirmation email (internal service endpoint, no auth required)"""
    from sqlalchemy import text
    
    # Get user email
    result = db.execute(
        text("SELECT email, first_name FROM users WHERE id = :user_id"),
        {"user_id": notification.user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    email, first_name = user
    
    # Create email content
    subject = f"Подтверждение оплаты бронирования {notification.payment_id}"
    body = f"""
Здравствуйте, {first_name}!

Ваш платеж успешно обработан.

Детали платежа:
- ID платежа: {notification.payment_id}
- Сумма: {notification.amount} {notification.currency}
- Способ оплаты: {notification.payment_method}
- ID бронирования: {notification.booking_id}
"""
    
    if notification.flight_number:
        body += f"""
Детали рейса:
- Номер рейса: {notification.flight_number}
- Маршрут: {notification.origin} → {notification.destination}
"""
    
    body += """
Спасибо за выбор Airline!

С уважением,
Команда Airline
"""
    
    html = f"""
    <html>
      <body>
        <h2>Подтверждение оплаты</h2>
        <p>Здравствуйте, <strong>{first_name}</strong>!</p>
        <p>Ваш платеж успешно обработан.</p>
        <h3>Детали платежа:</h3>
        <ul>
          <li>ID платежа: <strong>{notification.payment_id}</strong></li>
          <li>Сумма: <strong>{notification.amount} {notification.currency}</strong></li>
          <li>Способ оплаты: <strong>{notification.payment_method}</strong></li>
          <li>ID бронирования: <strong>{notification.booking_id}</strong></li>
        </ul>
"""
    
    if notification.flight_number:
        html += f"""
        <h3>Детали рейса:</h3>
        <ul>
          <li>Номер рейса: <strong>{notification.flight_number}</strong></li>
          <li>Маршрут: <strong>{notification.origin} → {notification.destination}</strong></li>
        </ul>
"""
    
    html += """
        <p>Спасибо за выбор Airline!</p>
        <p>С уважением,<br>Команда Airline</p>
      </body>
    </html>
    """
    
    success = send_email(to_email=email, subject=subject, body=body, html=html)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return {"message": "Payment notification sent", "to": email}


@app.post("/notify-flight-change")
async def notify_flight_change(
    notification_data: dict,
    db: Session = Depends(get_db)
):
    """Send flight change/cancellation notification to all affected users (internal service endpoint)"""
    from sqlalchemy import text
    
    flight_id = notification_data.get("flight_id")
    change_type = notification_data.get("change_type", "cancelled")  # cancelled, changed
    new_departure_time = notification_data.get("new_departure_time")
    new_arrival_time = notification_data.get("new_arrival_time")
    
    # Get all users with bookings for this flight
    result = db.execute(
        text("""
            SELECT DISTINCT u.id, u.email, u.first_name, 
                   f.flight_number, f.origin, f.destination,
                   f.departure_time, f.arrival_time
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN flights f ON b.flight_id = f.id
            WHERE b.flight_id = :flight_id AND b.status = 'confirmed'
        """),
        {"flight_id": flight_id}
    )
    users = result.fetchall()
    
    if not users:
        return {"message": "No users to notify", "count": 0}
    
    sent_count = 0
    for user_row in users:
        user_id, user_email, first_name, flight_number, origin, destination, old_departure, old_arrival = user_row
        
        if change_type == "cancelled":
            subject = f"Отмена рейса {flight_number}"
            body = f"""
Здравствуйте, {first_name}!

К сожалению, рейс {flight_number} был отменен.

Детали рейса:
- Номер рейса: {flight_number}
- Маршрут: {origin} → {destination}
- Дата вылета: {old_departure}

Ваше бронирование будет автоматически отменено, и средства будут возвращены на ваш счет в течение 5-7 рабочих дней.

Если у вас есть вопросы, пожалуйста, свяжитесь с нашей службой поддержки.

С уважением,
Команда Airline
"""
            html = f"""
            <html>
              <body>
                <h2>Отмена рейса</h2>
                <p>Здравствуйте, <strong>{first_name}</strong>!</p>
                <p>К сожалению, рейс <strong>{flight_number}</strong> был отменен.</p>
                <h3>Детали рейса:</h3>
                <ul>
                  <li>Номер рейса: <strong>{flight_number}</strong></li>
                  <li>Маршрут: <strong>{origin} → {destination}</strong></li>
                  <li>Дата вылета: <strong>{old_departure}</strong></li>
                </ul>
                <p>Ваше бронирование будет автоматически отменено, и средства будут возвращены на ваш счет в течение 5-7 рабочих дней.</p>
                <p>Если у вас есть вопросы, пожалуйста, свяжитесь с нашей службой поддержки.</p>
                <p>С уважением,<br>Команда Airline</p>
              </body>
            </html>
            """
        else:  # changed
            subject = f"Изменение рейса {flight_number}"
            body = f"""
Здравствуйте, {first_name}!

Информируем вас об изменении расписания рейса {flight_number}.

Детали рейса:
- Номер рейса: {flight_number}
- Маршрут: {origin} → {destination}
"""
            if new_departure_time:
                body += f"- Новая дата вылета: {new_departure_time}\n"
            if new_arrival_time:
                body += f"- Новая дата прилета: {new_arrival_time}\n"
            
            body += """
Пожалуйста, проверьте новое расписание и при необходимости свяжитесь с нашей службой поддержки.

С уважением,
Команда Airline
"""
            html = f"""
            <html>
              <body>
                <h2>Изменение рейса</h2>
                <p>Здравствуйте, <strong>{first_name}</strong>!</p>
                <p>Информируем вас об изменении расписания рейса <strong>{flight_number}</strong>.</p>
                <h3>Детали рейса:</h3>
                <ul>
                  <li>Номер рейса: <strong>{flight_number}</strong></li>
                  <li>Маршрут: <strong>{origin} → {destination}</strong></li>
"""
            if new_departure_time:
                html += f"                  <li>Новая дата вылета: <strong>{new_departure_time}</strong></li>\n"
            if new_arrival_time:
                html += f"                  <li>Новая дата прилета: <strong>{new_arrival_time}</strong></li>\n"
            
            html += """
                </ul>
                <p>Пожалуйста, проверьте новое расписание и при необходимости свяжитесь с нашей службой поддержки.</p>
                <p>С уважением,<br>Команда Airline</p>
              </body>
            </html>
            """
        
        success = send_email(to_email=user_email, subject=subject, body=body, html=html)
        if success:
            sent_count += 1
    
    return {"message": f"Flight change notifications sent", "count": sent_count}


@app.post("/notify-booking-cancelled")
async def notify_booking_cancelled(
    notification_data: dict,
    db: Session = Depends(get_db)
):
    """Send booking cancellation notification (internal service endpoint)"""
    from sqlalchemy import text
    
    user_id = notification_data.get("user_id")
    booking_id = notification_data.get("booking_id")
    flight_number = notification_data.get("flight_number")
    origin = notification_data.get("origin")
    destination = notification_data.get("destination")
    departure_time = notification_data.get("departure_time")
    
    # Get user email
    result = db.execute(
        text("SELECT email, first_name FROM users WHERE id = :user_id"),
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    email, first_name = user
    
    # Create email content
    subject = f"Отмена бронирования рейса {flight_number}"
    body = f"""
Здравствуйте, {first_name}!

Ваше бронирование было отменено.

Детали рейса:
- Номер рейса: {flight_number}
- Маршрут: {origin} → {destination}
- Дата вылета: {departure_time}
- ID бронирования: {booking_id}

Если у вас есть вопросы, пожалуйста, свяжитесь с нашей службой поддержки.

С уважением,
Команда Airline
"""
    html = f"""
    <html>
      <body>
        <h2>Отмена бронирования</h2>
        <p>Здравствуйте, <strong>{first_name}</strong>!</p>
        <p>Ваше бронирование было отменено.</p>
        <h3>Детали рейса:</h3>
        <ul>
          <li>Номер рейса: <strong>{flight_number}</strong></li>
          <li>Маршрут: <strong>{origin} → {destination}</strong></li>
          <li>Дата вылета: <strong>{departure_time}</strong></li>
          <li>ID бронирования: <strong>{booking_id}</strong></li>
        </ul>
        <p>Если у вас есть вопросы, пожалуйста, свяжитесь с нашей службой поддержки.</p>
        <p>С уважением,<br>Команда Airline</p>
      </body>
    </html>
    """
    
    success = send_email(to_email=email, subject=subject, body=body, html=html)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return {"message": "Booking cancellation notification sent", "to": email}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    smtp_configured = bool(SMTP_USER and SMTP_PASSWORD)
    return {
        "status": "healthy",
        "service": "notification-service",
        "smtp_configured": smtp_configured,
        "smtp_host": SMTP_HOST if smtp_configured else None
    }


@app.post("/test-email")
async def test_email(
    email_data: EmailRequest,
    db: Session = Depends(get_db)
):
    """Test email sending endpoint (for debugging)"""
    print(f"[TEST EMAIL] Testing email to {email_data.to}")
    
    success = send_email(
        to_email=email_data.to,
        subject=email_data.subject,
        body=email_data.body,
        html=email_data.html
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test email. Check logs for details."
        )
    
    return {
        "message": "Test email sent successfully",
        "to": email_data.to,
        "smtp_configured": bool(SMTP_USER and SMTP_PASSWORD)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

