#!/usr/bin/env python3
"""
Скрипт для генерации тестовых записей багажа
Использование: python generate_baggage.py
"""

import psycopg2
import random
import string

DATABASE_URL = "postgresql://airline_user:airline_password@localhost:5432/airline_db"

baggage_statuses = [
    "checked_in",
    "in_transit",
    "loaded",
    "unloaded",
    "delivered"
]

baggage_locations = [
    "Airport Check-in",
    "Loading Area",
    "On Aircraft",
    "Arrival Terminal",
    "Baggage Claim",
    "Delivered to Passenger"
]

def generate_baggage_tag() -> str:
    """Генерирует уникальный номер багажной бирки"""
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=6))
    return f"{letters}{numbers}"

def create_baggage(count: int = 30):
    """Создает тестовые записи багажа"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Получаем все подтвержденные бронирования
        cur.execute("""
            SELECT id FROM bookings 
            WHERE status = 'confirmed'
            ORDER BY RANDOM()
            LIMIT %s
        """, (count,))
        
        bookings = cur.fetchall()
        
        if not bookings:
            print("Нет подтвержденных бронирований. Сначала создайте бронирования через веб-интерфейс.")
            return []

        created_baggage = []
        
        # Для каждого бронирования создаем 0-2 единицы багажа
        for booking_tuple in bookings:
            booking_id = booking_tuple[0]
            baggage_count = random.randint(0, 2)  # 0, 1 или 2 единицы багажа
            
            for _ in range(baggage_count):
                baggage_tag = generate_baggage_tag()
                
                # Проверяем уникальность бирки
                cur.execute("SELECT id FROM baggage WHERE baggage_tag = %s", (baggage_tag,))
                while cur.fetchone():
                    baggage_tag = generate_baggage_tag()
                    cur.execute("SELECT id FROM baggage WHERE baggage_tag = %s", (baggage_tag,))
                
                # Генерируем вес (от 5 до 32 кг)
                weight = round(random.uniform(5.0, 32.0), 2)
                
                # Случайный статус и местоположение
                status = random.choice(baggage_statuses)
                location = random.choice(baggage_locations)
                
                try:
                    cur.execute("""
                        INSERT INTO baggage (booking_id, baggage_tag, weight, status, location)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id, baggage_tag
                    """, (booking_id, baggage_tag, weight, status, location))
                    
                    baggage_id, tag = cur.fetchone()
                    created_baggage.append((baggage_id, tag))
                    print(f"✓ Создан багаж: {tag} для бронирования {booking_id} (ID: {baggage_id}, вес: {weight} кг, статус: {status})")
                except Exception as e:
                    print(f"✗ Ошибка при создании багажа: {e}")
                    conn.rollback()
                    continue

        conn.commit()
        cur.close()
        conn.close()

        print(f"\n✓ Всего создано записей багажа: {len(created_baggage)}")
        print("\nПримечание: для создания багажа нужны существующие бронирования.")
        print("Создайте бронирования через веб-интерфейс перед запуском этого скрипта.")
        
        return created_baggage

    except Exception as e:
        print(f"Ошибка: {e}")
        return []

if __name__ == "__main__":
    print("Генерация тестового багажа...")
    print("-" * 50)
    create_baggage(count=30)

