import TelegramBot from 'node-telegram-bot-api'
import "dotenv/config.js"

const token = process.env.TG_TOKEN;
const bot = new TelegramBot(token, {
    polling: {
        autoStart: true
    }
});

const lena_log_chanel_id = -1001891047764

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

bot.on('polling_error', (error) => {
    console.error(error);
});
