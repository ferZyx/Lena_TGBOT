# Lena Telegram Bot

Telegram бот для связи с пользователями с поддержкой polling и webhook режимов.

## Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Настройка .env

Скопируйте `.env.example` в `.env` и укажите ваш токен бота:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```bash
TG_TOKEN=your_telegram_bot_token_here
```

### Запуск бота

```bash
# Локально
npm start

# Через PM2
pm2 start ecosystem.config.cjs
pm2 logs lena-bot
```

## Режимы работы

Бот поддерживает два режима:

### 1. Polling (по умолчанию)

Простой режим без дополнительных настроек:

```bash
BOT_MODE=polling
```

### 2. Webhook

Более надежный режим для production. Требует HTTPS домен и nginx.

**Преимущества:**
- Более надёжная доставка сообщений
- Меньше нагрузки на сервер
- Мгновенная доставка updates

**Миграция на webhook:**
См. подробную инструкцию в [WEBHOOK_MIGRATION.md](./WEBHOOK_MIGRATION.md)

## Структура проекта

```
.
├── app.js                    # Главный файл приложения
├── config.js                 # Конфигурация бота
├── router.js                 # Express routes для webhook
├── utils/
│   ├── botHealthMonitor.js  # Мониторинг здоровья бота
│   └── webhookTester.js     # Тестирование webhook endpoints
├── nginx.conf               # Пример nginx конфигурации
├── .env                     # Переменные окружения (не коммитится)
├── .env.example            # Пример переменных окружения
└── WEBHOOK_MIGRATION.md    # Инструкция по миграции на webhook
```

## Endpoints

При запуске бота доступны следующие endpoints:

### Health Check

```bash
GET http://localhost:5002/bot/health
```

Ответ:

```json
{
  "status": "healthy",
  "mode": "polling",
  "healthy": true,
  "checks": {
    "bot": true,
    "uptime": 123,
    "timeSinceLastActivity": 5
  },
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

### Webhook (только в webhook режиме)

```bash
POST http://localhost:5002/bot/webhook
```

### Webhook Test

```bash
POST http://localhost:5002/bot/webhook/test
```

## Переменные окружения

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `TG_TOKEN` | Telegram bot token | - | ✅ |
| `LOG_CHANEL_ID` | ID канала для логов | -1001891047764 | ❌ |
| `BOT_MODE` | Режим работы (polling/webhook) | polling | ❌ |
| `WEBHOOK_DOMAIN` | Домен для webhook | - | Только для webhook |
| `WEBHOOK_PATH` | Путь для webhook | /bot/webhook | ❌ |
| `WEBHOOK_PORT` | Порт для Express сервера | 5002 | ❌ |

## Функционал бота

- `/start` - Приветственное сообщение
- Пересылка сообщений в лог-канал
- Ответы от администраторов через команду `/answer user_id message`

## Мониторинг

Бот включает встроенный health monitor:

- Отслеживает время последней активности
- Проверяет работоспособность бота
- Предоставляет health check endpoint

Рекомендуется настроить внешний мониторинг (UptimeRobot, Healthchecks.io) для production.

## Миграция на Webhook

Для миграции с polling на webhook режим:

1. Прочитайте [WEBHOOK_MIGRATION.md](./WEBHOOK_MIGRATION.md)
2. Настройте nginx (см. `nginx.conf`)
3. Протестируйте webhook в polling режиме
4. Переключитесь на webhook режим

**ВАЖНО:** Всегда тестируйте webhook перед миграцией!

## Troubleshooting

### Бот не запускается

- Проверьте, что указан правильный `TG_TOKEN` в `.env`
- Проверьте логи: `pm2 logs lena-bot`

### Webhook не работает

- Проверьте nginx конфигурацию: `sudo nginx -t`
- Проверьте порт: `netstat -tulpn | grep 5002`
- Проверьте логи: `pm2 logs lena-bot`
- См. подробные инструкции в [WEBHOOK_MIGRATION.md](./WEBHOOK_MIGRATION.md)

## Лицензия

ISC
