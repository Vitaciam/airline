# Airline Application - Система бронирования авиабилетов

Перед началом работы убедитесь, что у вас установлено:

- **Docker Desktop** (для Windows/Mac) или **Docker** + **Docker Compose** (для Linux)
  - Скачать: https://www.docker.com/products/docker-desktop
- **PyCharm** (рекомендуется) или любой другой Python IDE

## Первая установка
### Шаг 1: Открытие проекта

1. Запустите PyCharm
2. Выберите `File` → `Open...`
3. Выберите папку `AirlineApp` (корневую папку проекта)
4. Нажмите `OK`

### Шаг 2: Настройка интерпретатора Python

PyCharm автоматически определит структуру проекта. Для работы с микросервисами:

1. Перейдите в `File` → `Settings` (или `PyCharm` → `Preferences` на Mac)
2. Выберите `Project: AirlineApp` → `Python Interpreter`
3. Убедитесь, что выбран Python 3.11 или выше
4. Если интерпретатор не установлен, установите его через PyCharm

## Настройка Docker
### Шаг 3: Установка Docker Desktop

1. Скачайте Docker Desktop с официального сайта: https://www.docker.com/products/docker-desktop
2. Установите Docker Desktop
3. Запустите Docker Desktop
4. Дождитесь, пока Docker полностью запустится (иконка в трее должна быть зеленой)

### Шаг 4: Создание Docker образов и контейнеров

В терминале PyCharm (или в обычном терминале в папке проекта) выполните:

cd /путь/к/проекту/AirlineApp
docker-compose build

Эта команда создаст все необходимые Docker образы для микросервисов. Процесс может занять несколько минут при первом запуске.

### Шаг 5: Запуск через терминал PyCharm

1. Откройте терминал в PyCharm (`View` → `Tool Windows` → `Terminal`)
2. Убедитесь, что вы находитесь в корневой папке проекта
3. Выполните команду:

docker-compose up -d

Флаг `-d` запускает контейнеры в фоновом режиме.

### Что происходит при запуске:

1. Docker создает сеть для контейнеров
2. Запускается PostgreSQL база данных
3. Запускаются все микросервисы:
   - Auth Service (порт 8001)
   - Booking Service (порт 8002)
   - Baggage Service (порт 8003)
   - Admin Service (порт 8004)
   - Notification Service (порт 8005)
   - Payment Service (порт 8006)
4. Запускается Frontend (порт 3000)

### Проверка статуса

Проверить, что все контейнеры запущены:

docker-compose ps

Все сервисы должны иметь статус `Up`.


## Доступ к приложению

После успешного запуска откройте в браузере:

- **Frontend (веб-интерфейс):** http://localhost:3000
- **API документация (Swagger):**
  - Auth Service: http://localhost:8001/docs
  - Booking Service: http://localhost:8002/docs
  - Payment Service: http://localhost:8006/docs
  - Admin Service: http://localhost:8004/docs
  - Baggage Service: http://localhost:8003/docs
  - Notification Service: http://localhost:8005/docs

### Первый вход

1. Откройте http://localhost:3000
2. Зарегистрируйте новый аккаунт или войдите, если аккаунт уже создан
3. Для доступа к админ-панели нужен аккаунт с правами администратора

## Остановка приложения
### Остановка контейнеров (без удаления)

docker-compose stop

### Остановка и удаление контейнеров

docker-compose down

### Остановка и удаление контейнеров + данных

docker-compose down -v

**Внимание:** Команда `-v` удалит все данные из базы данных!


## Перезапуск после изменений

### Если вы изменили код микросервисов:

docker-compose up -d --build

Эта команда пересоберет образы и перезапустит контейнеры.

### Если вы изменили настройки в .env:

docker-compose down
docker-compose up -d

Или для конкретного сервиса (например, notification-service):

docker-compose stop notification-service
docker-compose rm -f notification-service
docker-compose up -d notification-service


## Структура проекта

```
AirlineApp/
├── docker-compose.yml              # Конфигурация всех сервисов
├── .env                            # Переменные окружения (создать вручную)
├── README.md                       # Документация
├── ARCHITECTURE.md                 # Архитектура приложения
│
├── auth-service/                   # Микросервис аутентификации
│   ├── src/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── booking-service/                # Микросервис бронирования
│   ├── src/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── payment-service/                # Микросервис платежей
│   ├── src/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── admin-service/                  # Микросервис администрирования
│   ├── src/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── baggage-service/                # Микросервис багажа
│   ├── src/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── notification-service/           # Микросервис уведомлений
│   ├── src/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/                       # React приложение
    ├── src/
    ├── package.json
    └── Dockerfile
```

## Решение проблем

### Проблема: Порт уже занят

Если вы видите ошибку `port is already allocated`:

1. Остановите другие приложения, использующие порты 3000, 8001-8006, 5432
2. Или измените порты в `docker-compose.yml`

### Проблема: Docker не запускается

1. Убедитесь, что Docker Desktop запущен
2. Перезапустите Docker Desktop
3. Проверьте, что виртуализация включена в BIOS (для Windows)

### Проблема: Email не отправляется

1. Проверьте файл `.env` - правильные ли данные
2. Убедитесь, что используется App Password, а не обычный пароль
3. Проверьте логи: `docker-compose logs notification-service`

### Проблема: База данных не подключается

1. Убедитесь, что PostgreSQL контейнер запущен: `docker-compose ps`
2. Проверьте логи: `docker-compose logs postgres`

### Просмотр логов

Для просмотра логов конкретного сервиса:

docker-compose logs [название-сервиса]

Например:

docker-compose logs notification-service
docker-compose logs frontend
docker-compose logs booking-service

Для просмотра логов в реальном времени:

docker-compose logs -f [название-сервиса]


## Тестирование

Проект включает unit тесты для всех микросервисов. Подробная информация в [TESTING.md](TESTING.md).

### Запуск тестов локально

Для запуска тестов одного сервиса:

```bash
cd auth-service
pytest tests/ -v
```

Для запуска всех тестов:

```bash
chmod +x run_tests.sh
./run_tests.sh
```

### Запуск тестов с покрытием

```bash
cd auth-service
pytest tests/ -v --cov=src --cov-report=html
```

## CI/CD

Проект настроен с GitHub Actions для автоматического тестирования и сборки:

- **Автоматические тесты**: При каждом push и pull request запускаются unit тесты для всех сервисов
- **Сборка Docker образов**: После успешных тестов собираются Docker образы
- **Проверка docker-compose**: Финальная проверка всех сервисов через docker-compose

Workflow файл: `.github/workflows/ci.yml`

## Полезные команды

### Просмотр статуса всех контейнеров

docker-compose ps

### Просмотр использования ресурсов

docker stats

### Вход в контейнер (для отладки)

docker-compose exec [название-сервиса] sh

Например:
docker-compose exec postgres psql -U airline_user -d airline_db

### Пересборка конкретного сервиса

docker-compose build [название-сервиса]
docker-compose up -d [название-сервиса]


