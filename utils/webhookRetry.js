import config from '../config.js';

/**
 * Webhook Retry Manager
 * Handles automatic retry of webhook setup with exponential backoff
 */
class WebhookRetryManager {
    constructor(bot) {
        this.bot = bot;
        this.maxRetries = 20;
        this.baseDelay = 2000; // 2 seconds
        this.maxDelay = 60000; // 60 seconds
        this.retryCount = 0;
        this.isRetrying = false;
        this.retryTimer = null;
        this.webhookUrl = null;
        this.lastSuccessfulSetup = null;
    }

    /**
     * Set webhook with automatic retry on failure
     * @param {string} webhookUrl - The webhook URL to set
     * @returns {Promise<boolean>} - True if webhook was set successfully
     */
    async setWebhookWithRetry(webhookUrl) {
        this.webhookUrl = webhookUrl;
        return await this._attemptWebhookSetup();
    }

    /**
     * Internal method to attempt webhook setup
     * @private
     */
    async _attemptWebhookSetup() {
        try {
            await this.bot.setWebHook(this.webhookUrl);
            console.log(`Webhook set successfully: ${this.webhookUrl}`);

            // Verify webhook was actually set
            const webhookInfo = await this.bot.getWebHookInfo();
            if (webhookInfo.url === this.webhookUrl) {
                console.log('Webhook verification passed', {
                    url: webhookInfo.url,
                    pending_update_count: webhookInfo.pending_update_count,
                    last_error_date: webhookInfo.last_error_date,
                    last_error_message: webhookInfo.last_error_message
                });

                this.lastSuccessfulSetup = Date.now();
                this.retryCount = 0;
                this.isRetrying = false;

                return true;
            } else {
                throw new Error(`Webhook URL mismatch. Expected: ${this.webhookUrl}, Got: ${webhookInfo.url}`);
            }
        } catch (e) {
            console.error('Failed to set webhook!', {
                error: e.message,
                stack: e.stack,
                attempt: this.retryCount + 1,
                maxRetries: this.maxRetries
            });

            // Notify admin on first failure
            if (this.retryCount === 0 && !config.DEBUG) {
                this.bot.sendMessage(config.LOG_CHANEL_ID,
                    `⚠️ Failed to set webhook! Will retry automatically.\n\nError: ${e.message}\nAttempt: ${this.retryCount + 1}/${this.maxRetries}`
                ).catch(err => console.error('Failed to send webhook error notification', err));
            }

            // Schedule retry if haven't exceeded max retries
            if (this.retryCount < this.maxRetries) {
                await this._scheduleRetry();
                return false;
            } else {
                console.error('Max webhook retry attempts reached!', {
                    maxRetries: this.maxRetries,
                    lastError: e.message
                });

                // Critical notification - all retries failed
                if (!config.DEBUG) {
                    this.bot.sendMessage(config.LOG_CHANEL_ID,
                        `🚨 CRITICAL: Webhook setup failed after ${this.maxRetries} attempts!\n\nLast error: ${e.message}\n\nBot may not receive updates!`
                    ).catch(err => console.error('Failed to send critical webhook notification', err));
                }

                this.isRetrying = false;
                return false;
            }
        }
    }

    /**
     * Schedule next retry attempt with exponential backoff
     * @private
     */
    async _scheduleRetry() {
        this.retryCount++;
        this.isRetrying = true;

        // Calculate delay with exponential backoff: baseDelay * 2^retryCount
        const delay = Math.min(
            this.baseDelay * Math.pow(2, this.retryCount - 1),
            this.maxDelay
        );

        console.log(`Scheduling webhook retry in ${delay}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`);

        // Clear existing timer if any
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }

        // Schedule retry
        this.retryTimer = setTimeout(async () => {
            console.log(`Retrying webhook setup (attempt ${this.retryCount + 1}/${this.maxRetries})...`);
            await this._attemptWebhookSetup();
        }, delay);
    }

    /**
     * Monitor webhook health and retry if needed
     * Should be called periodically
     */
    async monitorWebhookHealth() {
        if (this.isRetrying) {
            console.log('Webhook retry already in progress, skipping health check');
            return;
        }

        try {
            const webhookInfo = await this.bot.getWebHookInfo();

            // Check if webhook is set correctly
            if (!webhookInfo.url || webhookInfo.url !== this.webhookUrl) {
                console.warn('Webhook URL mismatch detected!', {
                    expected: this.webhookUrl,
                    actual: webhookInfo.url
                });

                // Reset retry count and attempt to fix
                this.retryCount = 0;
                await this._attemptWebhookSetup();
                return;
            }

            // Check for recent errors
            if (webhookInfo.last_error_date) {
                const errorDate = new Date(webhookInfo.last_error_date * 1000);
                const timeSinceError = Date.now() - errorDate.getTime();

                // If error is recent (within last 5 minutes), log warning
                if (timeSinceError < 5 * 60 * 1000) {
                    console.warn('Recent webhook error detected', {
                        last_error_date: errorDate.toISOString(),
                        last_error_message: webhookInfo.last_error_message,
                        pending_update_count: webhookInfo.pending_update_count
                    });

                    // If there are many pending updates, notify admin
                    if (webhookInfo.pending_update_count > 50) {
                        if (!config.DEBUG) {
                            this.bot.sendMessage(config.LOG_CHANEL_ID,
                                `⚠️ Webhook has ${webhookInfo.pending_update_count} pending updates!\n\nLast error: ${webhookInfo.last_error_message}`
                            ).catch(e => console.error('Failed to send webhook health notification', e));
                        }
                    }
                }
            }

            console.log('Webhook health check passed', {
                url: webhookInfo.url,
                pending_updates: webhookInfo.pending_update_count
            });

        } catch (e) {
            console.error('Error during webhook health monitoring', e);
        }
    }

    /**
     * Cancel any pending retry attempts
     */
    cancelRetry() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        this.isRetrying = false;
        this.retryCount = 0;
    }

    /**
     * Get current retry status
     */
    getStatus() {
        return {
            isRetrying: this.isRetrying,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries,
            lastSuccessfulSetup: this.lastSuccessfulSetup,
            webhookUrl: this.webhookUrl
        };
    }
}

export default WebhookRetryManager;
