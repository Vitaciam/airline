FROM node:18-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./
RUN npm install

# Копируем остальные файлы
COPY . .

# Переменные окружения должны быть установлены до сборки
# React компилирует их во время запуска в dev режиме
EXPOSE 3000

# Используем --host 0.0.0.0 чтобы принимать соединения извне
CMD ["npm", "start", "--", "--host", "0.0.0.0"]
