#!/usr/bin/env python3
"""
Скрипт для генерации тестовых рейсов
Использование: python generate_flights.py
"""

import psycopg2
from datetime import datetime, timedelta
import random

DATABASE_URL = "postgresql://airline_user:airline_password@localhost:5432/airline_db"

# Списки для генерации данных
cities = [
    "Москва", "Санкт-Петербург", "Казань", "Новосибирск", "Екатеринбург",
    "Краснодар", "Сочи", "Владивосток", "Калининград", "Мурманск",
    "Челябинск", "Уфа", "Самара", "Воронеж", "Ростов-на-Дону"
]

airline_names = [
    ("Аэрофлот", "SU"),
    ("S7 Airlines", "S7"),
    ("Победа", "DP"),
    ("Уральские авиалинии", "U6"),
    ("Россия", "FV"),
    ("Якутия", "R3"),
    ("Уральские авиалинии", "U6"),
    ("Азимут", "A4")
]

def get_or_create_airlines(cur, conn):
    """Создает авиакомпании, если их нет"""
    airlines = {}
    
    for name, code in airline_names:
        try:
            cur.execute("SELECT id FROM airlines WHERE code = %s", (code,))
            result = cur.fetchone()
            if result:
                airlines[code] = result[0]
            else:
                cur.execute("""
                    INSERT INTO airlines (name, code, country)
                    VALUES (%s, %s, %s)
                    RETURNING id
                """, (name, code, "Россия"))
                airline_id = cur.fetchone()[0]
                airlines[code] = airline_id
                print(f"✓ Создана авиакомпания: {name} ({code})")
        except Exception as e:
            print(f"Ошибка при создании авиакомпании {code}: {e}")
            conn.rollback()
            continue
    
    conn.commit()
    return airlines

def generate_flight_number(airline_code: str) -> str:
    """Генерирует номер рейса"""
    number = random.randint(100, 9999)
    return f"{airline_code}{number}"

def create_flights(count: int = 50):
    """Создает тестовые рейсы"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Получаем или создаем авиакомпании
        airlines = get_or_create_airlines(cur, conn)

        if not airlines:
            print("Ошибка: не удалось создать авиакомпании")
            return

        created_flights = []
        base_time = datetime.now()

        for i in range(count):
            # Выбираем случайную авиакомпанию
            airline_code = random.choice(list(airlines.keys()))
            airline_id = airlines[airline_code]
            flight_number = generate_flight_number(airline_code)

            # Выбираем случайные города
            origin = random.choice(cities)
            destination = random.choice([c for c in cities if c != origin])

            # Генерируем время вылета (от текущего момента до +30 дней)
            days_ahead = random.randint(0, 30)
            hours_ahead = random.randint(0, 23)
            minutes = random.choice([0, 15, 30, 45])
            
            departure_time = base_time + timedelta(days=days_ahead, hours=hours_ahead, minutes=minutes)
            
            # Время полета от 1 до 8 часов
            flight_duration = timedelta(hours=random.randint(1, 8))
            arrival_time = departure_time + flight_duration

            # Генерируем количество мест (от 50 до 300)
            total_seats = random.choice([50, 100, 150, 200, 250, 300])
            available_seats = total_seats - random.randint(0, int(total_seats * 0.3))  # 0-30% уже забронировано

            # Генерируем цену (от 3000 до 50000 рублей)
            price = random.randint(3000, 50000)

            try:
                cur.execute("""
                    INSERT INTO flights (airline_id, flight_number, origin, destination,
                                       departure_time, arrival_time, total_seats, available_seats, price)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, flight_number
                """, (airline_id, flight_number, origin, destination,
                      departure_time, arrival_time, total_seats, available_seats, price))
                
                flight_id, flight_num = cur.fetchone()
                created_flights.append((flight_id, flight_num))
                print(f"✓ Создан рейс: {flight_num} {origin} -> {destination} (ID: {flight_id})")
            except Exception as e:
                print(f"✗ Ошибка при создании рейса: {e}")
                conn.rollback()
                continue

        conn.commit()
        cur.close()
        conn.close()

        print(f"\n✓ Всего создано рейсов: {len(created_flights)}")
        return created_flights

    except Exception as e:
        print(f"Ошибка: {e}")
        return []

if __name__ == "__main__":
    print("Генерация тестовых рейсов...")
    print("-" * 50)
    create_flights(count=50)

