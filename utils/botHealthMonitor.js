/**
 * Bot Health Monitor
 *
 * Monitors bot health status including activity and database connection.
 */

class BotHealthMonitor {
    constructor() {
        this.lastBotActivity = Date.now();
        this.startTime = Date.now();
    }

    // Update last activity timestamp (call this on every bot update)
    updateActivity() {
        this.lastBotActivity = Date.now();
    }

    // Get time since last activity in seconds
    getTimeSinceLastActivity() {
        return Math.floor((Date.now() - this.lastBotActivity) / 1000);
    }

    // Get uptime in seconds
    getUptime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    // Check if bot is healthy
    async isHealthy() {
        const checks = {
            bot: false,
            uptime: this.getUptime(),
            timeSinceLastActivity: this.getTimeSinceLastActivity(),
        };

        // Check: Bot activity (no activity for more than 5 minutes is suspicious)
        const timeSinceActivity = this.getTimeSinceLastActivity();
        if (timeSinceActivity < 300) { // 5 minutes
            checks.bot = true;
        } else {
            console.warn(`Bot health check: No activity for ${timeSinceActivity} seconds`);
        }

        return {
            healthy: checks.bot,
            checks,
            timestamp: new Date().toISOString(),
        };
    }

    // Get health status as object
    async getStatus() {
        return this.isHealthy();
    }
}

export default new BotHealthMonitor();
