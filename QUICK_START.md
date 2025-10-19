# Быстрый старт - Миграция на Webhook

## Текущая ситуация

Бот работает в **polling** режиме. Webhook настроен для **безопасного тестирования** перед миграцией.

---

## Шаг 1: Установка зависимостей

```bash
npm install
```

---

## Шаг 2: Обновить nginx конфигурацию

Добавьте в ваш nginx конфиг для `api.bii.kz` следующие location блоки:

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

Перезагрузите nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Шаг 3: Протестировать webhook

Запустите бота (в .env уже настроены webhook параметры, но **BOT_MODE=polling**):

```bash
pm2 restart lena-bot
pm2 logs lena-bot --lines 50
```

**Смотрите в логи!** Должны увидеть:

```
Bot is running in POLLING mode.
Lena bot express server started at port 5002.
=== Starting webhook connectivity test ===
✓ Webhook test SUCCESSFUL: http://localhost:5002/bot/webhook
✓ Webhook test SUCCESSFUL: https://api.bii.kz/api/lena-bot/webhook
✓ All webhook endpoints are accessible
--- Checking migration readiness ---
✓ Bot is READY for webhook migration!
💡 To migrate: set BOT_MODE=webhook in .env and restart
```

✅ Если видите это - **всё готово к миграции!**

❌ Если видите ошибки - **НЕ мигрируйте**, сначала исправьте проблемы.

---

## Шаг 4: Миграция на webhook

**Только после успешного теста из Шага 3!**

1. Остановите бота:

```bash
pm2 stop lena-bot
```

2. Измените `.env`:

```bash
# В файле .env измените:
BOT_MODE=webhook
```

3. Запустите бота:

```bash
pm2 start lena-bot
pm2 logs lena-bot
```

4. Проверьте логи:

```
Bot will run in WEBHOOK mode. Webhook URL will be set after server starts.
Webhook set successfully: https://api.bii.kz/api/lena-bot/webhook
✓ Webhook test SUCCESSFUL
```

5. Отправьте тестовое сообщение боту - должен ответить мгновенно.

---

## Шаг 5: Проверка webhook через Telegram API

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Должно быть:

```json
{
  "ok": true,
  "result": {
    "url": "https://api.bii.kz/api/lena-bot/webhook",
    "pending_update_count": 0
  }
}
```

---

## Откат на Polling (если что-то пошло не так)

1. Остановите бота:

```bash
pm2 stop lena-bot
```

2. Удалите webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

3. Измените `.env`:

```bash
BOT_MODE=polling
```

4. Запустите бота:

```bash
pm2 start lena-bot
```

---

## Преимущества Webhook

✅ Более надёжная доставка updates
✅ Меньше нагрузки на сервер
✅ Мгновенная доставка сообщений
✅ Легче масштабируется

---

## Важные заметки

- **ВСЕГДА** тестируйте webhook в polling режиме перед миграцией
- Бот автоматически тестирует webhook при каждом запуске
- Логи покажут готовность к миграции
- Миграция занимает **меньше минуты** (если всё протестировано)
- Откат на polling **так же быстр**

---

## Если возникли проблемы

1. Проверьте логи: `pm2 logs lena-bot`
2. Проверьте nginx: `sudo tail -f /var/log/nginx/error.log`
3. Проверьте health: `curl https://api.bii.kz/api/lena-bot/health`
4. См. полную документацию: [WEBHOOK_MIGRATION.md](./WEBHOOK_MIGRATION.md)

---

**Готово!** Следуйте инструкции пошагово, и миграция пройдёт гладко.
