# Testing Guide

Этот документ описывает процесс тестирования для всех микросервисов приложения AirlineApp.

## Структура тестов

Каждый сервис имеет свою директорию `tests/` с unit тестами:

```
service-name/
├── src/
│   └── main.py
├── tests/
│   ├── __init__.py
│   └── test_service_name.py
└── requirements.txt
```

## Запуск тестов

### Запуск тестов для одного сервиса

```bash
cd auth-service
pytest tests/ -v
```

### Запуск тестов с покрытием кода

```bash
cd auth-service
pytest tests/ -v --cov=src --cov-report=html
```

### Запуск всех тестов

Используйте скрипт `run_tests.sh`:

```bash
chmod +x run_tests.sh
./run_tests.sh
```

Или используйте docker-compose:

```bash
docker-compose run --rm auth-service pytest tests/ -v
```

## Покрытие тестами

Каждый сервис имеет unit тесты, покрывающие:

- **auth-service**: Регистрация, логин, управление профилем, JWT токены
- **booking-service**: Поиск рейсов, создание бронирований, отмена
- **baggage-service**: Создание багажа, отслеживание статуса
- **admin-service**: Управление авиакомпаниями, рейсами, статистика
- **notification-service**: Отправка email уведомлений
- **payment-service**: Создание платежей, возвраты

## Настройка окружения для тестов

Тесты используют in-memory SQLite базу данных, поэтому не требуют настройки PostgreSQL для локального запуска.

Переменные окружения для тестов:
- `DATABASE_URL` - не требуется (используется SQLite)
- `JWT_SECRET` - тестовый ключ
- `JWT_ALGORITHM` - HS256

## CI/CD

Тесты автоматически запускаются при:
- Push в ветки main, master, develop
- Создании Pull Request

GitHub Actions workflow находится в `.github/workflows/ci.yml`

## Добавление новых тестов

При добавлении нового функционала:

1. Создайте тесты в соответствующей директории `tests/`
2. Следуйте существующей структуре тестов
3. Используйте фикстуры для создания тестовых данных
4. Запустите тесты локально перед коммитом

## Пример теста

```python
def test_create_user_success(client, test_user_data):
    """Test successful user creation"""
    response = client.post("/register", json=test_user_data)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
```

