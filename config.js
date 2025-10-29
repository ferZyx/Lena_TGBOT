import 'dotenv/config';

const config = {
    TG_TOKEN: process.env.TG_TOKEN,
    LOG_CHANEL_ID: process.env.LOG_CHANEL_ID || -1001891047764,

    // Bot mode: 'polling' or 'webhook'
    BOT_MODE: process.env.BOT_MODE || 'polling',

    // Webhook settings (optional, only needed for webhook mode)
    WEBHOOK_DOMAIN: process.env.WEBHOOK_DOMAIN,
    WEBHOOK_PATH: process.env.WEBHOOK_PATH || '/bot/webhook',
    WEBHOOK_PORT: process.env.WEBHOOK_PORT || '5002',

    // Debug mode
    DEBUG: process.env.DEBUG === 'true' || false,
};

// Validate required variables
const requiredVars = ['TG_TOKEN'];
requiredVars.forEach((key) => {
    if (config[key] === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

// Validate webhook-specific variables if webhook mode is enabled
if (config.BOT_MODE === 'webhook') {
    if (!config.WEBHOOK_DOMAIN) {
        throw new Error('WEBHOOK_DOMAIN is required when BOT_MODE=webhook');
    }
}

export default config;
