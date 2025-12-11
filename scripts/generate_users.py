#!/usr/bin/env python3
"""
Скрипт для генерации тестовых пользователей
Использование: python generate_users.py
"""

import psycopg2
from passlib.context import CryptContext
import random
import string

DATABASE_URL = "postgresql://airline_user:airline_password@localhost:5432/airline_db"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Списки для генерации случайных данных
first_names = [
    "Иван", "Петр", "Александр", "Дмитрий", "Андрей", "Сергей",
    "Мария", "Анна", "Елена", "Ольга", "Татьяна", "Наталья"
]

last_names = [
    "Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов",
    "Васильев", "Петрова", "Смирнова", "Кузнецова", "Попова", "Васильева"
]

cities = ["Москва", "Санкт-Петербург", "Казань", "Новосибирск", "Екатеринбург"]

def generate_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def generate_random_email(first_name: str, last_name: str) -> str:
    """Генерирует случайный email"""
    domains = ["gmail.com", "mail.ru", "yandex.ru", "outlook.com"]
    domain = random.choice(domains)
    number = random.randint(1, 9999)
    return f"{first_name.lower()}.{last_name.lower()}{number}@{domain}"

def generate_phone() -> str:
    """Генерирует случайный номер телефона"""
    return f"+7{random.randint(9000000000, 9999999999)}"

def create_users(count: int = 20, admin_count: int = 2):
    """Создает тестовых пользователей"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        created_users = []

        # Создание обычных пользователей
        for i in range(count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            email = generate_random_email(first_name, last_name)
            password_hash = generate_password_hash("password123")
            phone = generate_phone()
            is_admin = False

            try:
                cur.execute("""
                    INSERT INTO users (email, password_hash, first_name, last_name, phone, is_admin)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, email
                """, (email, password_hash, first_name, last_name, phone, is_admin))
                
                user_id, user_email = cur.fetchone()
                created_users.append((user_id, user_email, password_hash))
                print(f"✓ Создан пользователь: {user_email} (ID: {user_id})")
            except psycopg2.IntegrityError:
                print(f"✗ Пользователь {email} уже существует, пропускаем")
                conn.rollback()
                continue

        # Создание администраторов
        for i in range(admin_count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            email = generate_random_email(first_name, last_name)
            password_hash = generate_password_hash("admin123")
            phone = generate_phone()
            is_admin = True

            try:
                cur.execute("""
                    INSERT INTO users (email, password_hash, first_name, last_name, phone, is_admin)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, email
                """, (email, password_hash, first_name, last_name, phone, is_admin))
                
                user_id, user_email = cur.fetchone()
                created_users.append((user_id, user_email, password_hash))
                print(f"✓ Создан администратор: {user_email} (ID: {user_id})")
            except psycopg2.IntegrityError:
                print(f"✗ Пользователь {email} уже существует, пропускаем")
                conn.rollback()
                continue

        conn.commit()
        cur.close()
        conn.close()

        print(f"\n✓ Всего создано пользователей: {len(created_users)}")
        print("\nДля входа используйте:")
        print("  - Обычные пользователи: email + пароль 'password123'")
        print("  - Администраторы: email + пароль 'admin123'")
        
        return created_users

    except Exception as e:
        print(f"Ошибка: {e}")
        return []

if __name__ == "__main__":
    print("Генерация тестовых пользователей...")
    print("-" * 50)
    create_users(count=20, admin_count=2)

