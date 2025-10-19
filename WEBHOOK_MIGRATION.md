# Миграция Lena Bot с Polling на Webhook

Это руководство поможет безопасно мигрировать Lena бота с polling режима на webhook.

## Содержание

1. [Зачем нужен webhook?](#зачем-нужен-webhook)
2. [Требования](#требования)
3. [Пошаговая инструкция](#пошаговая-инструкция)
4. [Откат на polling](#откат-на-polling)
5. [Troubleshooting](#troubleshooting)

---

## Зачем нужен webhook?

### Преимущества webhook перед polling:

✅ **Более надёжная доставка** - Telegram сам отправляет updates, нет риска зависания polling
✅ **Меньше нагрузки** - нет постоянных HTTP запросов к Telegram API
✅ **Мгновенная доставка** - updates приходят без задержек
✅ **Масштабируемость** - легче работать с несколькими инстансами бота

### Недостатки:

❌ Требуется публичный HTTPS домен с SSL сертификатом
❌ Чуть сложнее в настройке

---

## Требования

Перед миграцией убедитесь, что у вас есть:

1. **Публичный домен с HTTPS** (например: `api.bii.kz`)
2. **SSL сертификат** (обычно уже есть на вашем домене)
3. **Nginx** для проксирования запросов (уже настроен)
4. **Свободный порт** на сервере (по умолчанию бот будет слушать `5002`)

---

## Пошаговая инструкция

### Шаг 1: Установка зависимостей

Установите новые зависимости:

```bash
npm install
```

### Шаг 2: Настройка nginx

Добавьте в вашу nginx конфигурацию для `api.bii.kz` следующие location блоки:

```nginx
# Lena Bot Webhook endpoint
location /api/lena-bot/webhook {
    proxy_pass http://localhost:5002/bot/webhook;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    proxy_read_timeout 60;
    proxy_connect_timeout 60;
}

# Lena Bot Health check
location /api/lena-bot/health {
    proxy_pass http://localhost:5002/bot/health;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Полный пример конфигурации смотрите в файле `nginx.conf`**

Проверьте конфигурацию и перезапустите nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 3: Обновление .env файла

Добавьте или измените следующие переменные в `.env`:

```bash
# ВАЖНО: Сначала оставляем polling для тестирования!
BOT_MODE=polling

# Webhook настройки (для api.bii.kz)
WEBHOOK_DOMAIN=https://api.bii.kz
WEBHOOK_PATH=/api/lena-bot/webhook
WEBHOOK_PORT=5002
```

**ВАЖНО:**
- `WEBHOOK_DOMAIN` должен включать протокол `https://`
- `WEBHOOK_PATH` должен совпадать с `location` в nginx (`/api/lena-bot/webhook`)
- Сначала оставляем `BOT_MODE=polling` для тестирования!

### Шаг 4: Тестирование webhook в polling режиме

**НЕ меняем BOT_MODE! Оставляем polling.**

Запускаем бота и проверяем логи:

```bash
# Запустить через PM2
pm2 restart lena-bot
pm2 logs lena-bot --lines 50

# Или напрямую для тестирования
npm start
```

В логах вы должны увидеть:

```
Bot is running in POLLING mode.
Lena bot express server started at port 5002.
=== Starting webhook connectivity test ===
Testing webhook endpoint... http://localhost:5002/bot/webhook
✓ Webhook test SUCCESSFUL: http://localhost:5002/bot/webhook
Testing webhook endpoint... https://api.bii.kz/api/lena-bot/webhook
✓ Webhook test SUCCESSFUL: https://api.bii.kz/api/lena-bot/webhook
✓ All webhook endpoints are accessible
--- Checking migration readiness ---
✓ Bot is READY for webhook migration!
💡 To migrate: set BOT_MODE=webhook in .env and restart
```

Если видите **"Bot is READY for webhook migration!"** - значит всё настроено правильно!

### Шаг 5: Финальная миграция на webhook

**Только после успешного теста из Шага 4!**

1. Остановить бота:

```bash
pm2 stop lena-bot
```

2. Изменить `.env`:

```bash
# Меняем режим на webhook
BOT_MODE=webhook
```

3. Запустить бота:

```bash
pm2 start lena-bot
pm2 logs lena-bot
```

В логах вы должны увидеть:

```
Bot will run in WEBHOOK mode. Webhook URL will be set after server starts.
Lena bot express server started at port 5002.
Webhook set successfully: https://api.bii.kz/api/lena-bot/webhook
=== Starting webhook connectivity test ===
✓ Webhook test SUCCESSFUL
```

### Шаг 6: Проверка webhook

Проверьте, что webhook установлен корректно:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Ответ должен содержать:

```json
{
  "ok": true,
  "result": {
    "url": "https://api.bii.kz/api/lena-bot/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Шаг 7: Тестирование

1. Отправьте сообщение боту в Telegram
2. Проверьте логи: `pm2 logs lena-bot`
3. Убедитесь, что бот отвечает

**Health check:**

```bash
curl https://api.bii.kz/api/lena-bot/health
```

Должен вернуть:

```json
{
  "status": "healthy",
  "mode": "webhook",
  "healthy": true,
  "checks": {
    "bot": true,
    "uptime": 123,
    "timeSinceLastActivity": 5
  },
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

---

## Откат на polling

Если что-то пошло не так, можно быстро откатиться на polling:

### Шаг 1: Остановить бота

```bash
pm2 stop lena-bot
```

### Шаг 2: Удалить webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

### Шаг 3: Изменить .env

```bash
BOT_MODE=polling
```

### Шаг 4: Перезапустить бота

```bash
pm2 restart lena-bot
pm2 logs lena-bot
```

В логах должно быть:

```
Bot is running in POLLING mode.
```

---

## Troubleshooting

### Проблема: Webhook не устанавливается

**Ошибка:** `Failed to set webhook`

**Решения:**

1. Проверьте, что домен доступен из интернета:
   ```bash
   curl https://api.bii.kz/api/lena-bot/health
   ```

2. Проверьте SSL сертификат:
   ```bash
   curl -v https://api.bii.kz/api/lena-bot/webhook/test
   ```

3. Убедитесь, что порт `5002` не заблокирован firewall

4. Проверьте логи nginx:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### Проблема: Бот не отвечает на сообщения

**Решения:**

1. Проверьте логи бота:
   ```bash
   pm2 logs lena-bot --lines 100
   ```

2. Проверьте pending updates:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

3. Если `pending_update_count > 0`, проверьте, что endpoint `/bot/webhook` возвращает `200 OK`

4. Проверьте nginx логи на наличие ошибок проксирования

### Проблема: Тесты не проходят

**Ошибка:** `✗ Webhook test FAILED`

**Решения:**

1. **Connection refused:**
   - Проверьте, запущен ли бот: `pm2 status`
   - Проверьте порты: `netstat -tulpn | grep 5002`

2. **Timeout:**
   - Проверьте nginx конфигурацию: `sudo nginx -t`
   - Проверьте nginx логи: `sudo tail -f /var/log/nginx/error.log`

3. **HTTP error (404, 502):**
   - Проверьте nginx location блоки
   - Убедитесь, что бот запущен и слушает порт 5002

---

## Дополнительные рекомендации

### Мониторинг

Настройте внешний мониторинг health check endpoint:

- **UptimeRobot** (бесплатно): https://uptimerobot.com
- **URL для мониторинга**: https://api.bii.kz/api/lena-bot/health
- **Интервал**: 5 минут

### PM2 Ecosystem

Обновите `ecosystem.config.cjs` если нужно изменить порт или другие настройки.

---

## Готово!

Бот теперь работает на webhook. Если возникли проблемы:

1. Проверьте логи: `pm2 logs lena-bot`
2. Проверьте health endpoint: `curl https://api.bii.kz/api/lena-bot/health`
3. Проверьте webhook info через Telegram API
4. Откатитесь на polling, если критично
