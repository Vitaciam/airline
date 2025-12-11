#!/bin/bash

# Скрипт для загрузки проекта на GitHub

echo "=========================================="
echo "Загрузка проекта AirlineApp на GitHub"
echo "=========================================="
echo ""

# Проверка, что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo "Ошибка: Запустите скрипт из корневой директории проекта AirlineApp"
    exit 1
fi

# Запрос информации о репозитории
echo "Введите ваше имя пользователя GitHub:"
read GITHUB_USERNAME

echo "Введите название репозитория (например: airline-app):"
read REPO_NAME

echo ""
echo "Создайте репозиторий на GitHub:"
echo "1. Перейдите на https://github.com/new"
echo "2. Название репозитория: $REPO_NAME"
echo "3. Выберите Public или Private"
echo "4. НЕ добавляйте README, .gitignore или лицензию"
echo "5. Нажмите 'Create repository'"
echo ""
echo "Нажмите Enter после создания репозитория..."
read

# Добавление remote
echo ""
echo "Добавление remote репозитория..."
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git 2>/dev/null || git remote set-url origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git

# Проверка текущей ветки
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Переименование ветки в main..."
    git branch -M main
fi

# Отправка на GitHub
echo ""
echo "Отправка кода на GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Проект успешно загружен на GitHub!"
    echo "=========================================="
    echo ""
    echo "Репозиторий: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "Следующие шаги:"
    echo "1. Перейдите на вкладку 'Actions' в вашем репозитории"
    echo "2. Дождитесь завершения CI/CD pipeline"
    echo "3. Проверьте, что все тесты прошли успешно"
    echo ""
else
    echo ""
    echo "❌ Ошибка при загрузке на GitHub"
    echo "Проверьте:"
    echo "1. Правильность имени пользователя и названия репозитория"
    echo "2. Что репозиторий создан на GitHub"
    echo "3. Что у вас есть права доступа к репозиторию"
    echo ""
fi

