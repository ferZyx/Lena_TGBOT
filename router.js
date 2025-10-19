import { Router } from "express";
import config from "./config.js";
import botHealthMonitor from "./utils/botHealthMonitor.js";

const router = new Router();

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const healthStatus = await botHealthMonitor.getStatus();
        const statusCode = healthStatus.healthy ? 200 : 503;

        return res.status(statusCode).json({
            status: healthStatus.healthy ? 'healthy' : 'unhealthy',
            mode: config.BOT_MODE,
            ...healthStatus
        });
    } catch (e) {
        console.error('Error in health check endpoint:', e);
        return res.status(500).json({
            status: 'error',
            error: e.message
        });
    }
});

// Webhook endpoint (works in both polling and webhook modes)
router.post('/webhook', async (req, res) => {
    try {
        const update = req.body;

        // Update bot activity
        botHealthMonitor.updateActivity();

        // Process the update
        const { bot } = await import('./app.js');
        await bot.processUpdate(update);

        return res.sendStatus(200);
    } catch (e) {
        console.error('Error processing webhook update:', e);
        return res.sendStatus(500);
    }
});

// Test webhook endpoint - для тестирования доступности webhook
router.post('/webhook/test', async (req, res) => {
    try {
        const testData = req.body;

        console.log('Test webhook call received', {
            mode: config.BOT_MODE,
            testData,
            timestamp: new Date().toISOString()
        });

        return res.status(200).json({
            success: true,
            mode: config.BOT_MODE,
            message: 'Test webhook endpoint is working',
            timestamp: new Date().toISOString(),
            receivedData: testData
        });
    } catch (e) {
        console.error('Error in test webhook endpoint:', e);
        return res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

export default router;
