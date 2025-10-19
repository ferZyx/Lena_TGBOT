import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import cors from 'cors';
import config from './config.js';
import router from './router.js';
import botHealthMonitor from './utils/botHealthMonitor.js';
import webhookTester from './utils/webhookTester.js';

// Initialize bot based on mode (polling or webhook)
let botOptions = {};
if (config.BOT_MODE === 'webhook') {
    botOptions = { polling: false, webHook: false };
    console.log('Bot will run in WEBHOOK mode. Webhook URL will be set after server starts.');
} else {
    botOptions = { polling: { autoStart: true } };
    console.log('Bot is running in POLLING mode.');
}

export const bot = new TelegramBot(config.TG_TOKEN, botOptions);

const lena_log_chanel_id = config.LOG_CHANEL_ID;

bot.on('message', async (msg) => {
    if (msg.text === '/start'){
        return await bot.sendMessage(msg.chat.id, 'Хей. Пиши, что хочешь, я постараюсь ответить быстро');
    }
    if (msg.chat.id !== lena_log_chanel_id) {
        try {
            await bot.sendMessage(lena_log_chanel_id, `Поступило сообщение на бота для СВЯЗИ!\nID: ${msg.chat.id}`);
            await bot.forwardMessage(lena_log_chanel_id, msg.chat.id, msg.message_id);
        } catch (error) {
            await bot.sendMessage(msg.chat.id, 'Произошла ошибка, попробуйте позже');
        } finally {
            await bot.sendMessage(msg.chat.id, 'Сообщение отправлено разработчикам. Постараемся ответить в кратчайшие сроки. Спасибо, что пользуетесь нашим ботом!');
        }
    } else {
        if (msg.text && msg.text.startsWith('/answer')) {
            const text = msg.text.split(' ');
            if (text.length < 3) {
                await bot.sendMessage(msg.chat.id, 'Неверный формат команды. Используйте /answer user_id message');
                return;
            }

            const user_id = text[1];
            const message_text = text.slice(2).join(' ');

            if (isNaN(parseFloat(user_id))) {
                await bot.sendMessage(msg.chat.id, 'Неверный user_id. user_id должен быть целым числом');
                return;
            }

            bot.sendMessage(user_id, message_text)
                .then(() => bot.sendMessage(msg.chat.id, 'Отправил брат!'))
                .catch((error) => console.error(error));
        }
    }
});

// Bot error handlers
bot.on('polling_error', (error) => {
    console.error('Polling error occurred!', error);
});

bot.on('webhook_error', (error) => {
    console.error('Webhook error occurred!', error);
});

// Track bot activity for health monitoring
bot.on('message', () => botHealthMonitor.updateActivity());
bot.on('callback_query', () => botHealthMonitor.updateActivity());

// Express server setup
const app = express();
app.use(cors());
app.use(express.json());
app.use('/bot', router);

const port = config.WEBHOOK_PORT;
const server = app.listen(port, async () => {
    console.log(`Lena bot express server started at port ${port}.`);

    // Set webhook if in webhook mode
    if (config.BOT_MODE === 'webhook') {
        try {
            const webhookUrl = `${config.WEBHOOK_DOMAIN}${config.WEBHOOK_PATH}`;
            await bot.setWebHook(webhookUrl);
            console.log(`Webhook set successfully: ${webhookUrl}`);
        } catch (e) {
            console.error('Failed to set webhook!', e);
        }
    }

    // Test webhook connectivity (works in both polling and webhook modes)
    // Небольшая задержка чтобы сервер точно был готов
    setTimeout(async () => {
        try {
            await webhookTester.testOnStartup();

            // В режиме polling проверяем готовность к миграции
            if (config.BOT_MODE === 'polling' && config.WEBHOOK_DOMAIN) {
                await webhookTester.checkMigrationReadiness();
            }
        } catch (e) {
            console.error('Error during webhook testing', e);
        }
    }, 2000); // 2 секунды задержка
});

// Node.js process error handlers
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception!', error);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection!', reason);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`${signal} received. Starting graceful shutdown...`);

    try {
        // Stop accepting new requests
        server.close(() => {
            console.log('HTTP server closed');
        });

        // Remove webhook if in webhook mode
        if (config.BOT_MODE === 'webhook') {
            await bot.deleteWebHook();
            console.log('Webhook removed');
        } else {
            // Stop polling
            await bot.stopPolling();
            console.log('Polling stopped');
        }

        console.log('Graceful shutdown completed');
        process.exit(0);
    } catch (e) {
        console.error('Error during graceful shutdown', e);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
