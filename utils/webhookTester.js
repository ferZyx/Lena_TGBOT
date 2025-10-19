/**
 * Webhook Testing Utility
 *
 * Тестирует доступность webhook endpoint при запуске бота.
 * Работает в любом режиме (polling или webhook).
 */

import axios from 'axios';
import config from '../config.js';

class WebhookTester {
    /**
     * Тестирует webhook endpoint
     * @param {string} webhookUrl - Полный URL webhook endpoint
     * @returns {Promise<Object>} Результат теста
     */
    async testWebhook(webhookUrl) {
        const testData = {
            test: true,
            mode: config.BOT_MODE,
            timestamp: new Date().toISOString(),
            source: 'webhookTester'
        };

        try {
            console.log(`Testing webhook endpoint... ${webhookUrl}`);

            const response = await axios.post(`${webhookUrl}/test`, testData, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 && response.data.success) {
                console.log(`✓ Webhook test SUCCESSFUL: ${webhookUrl}`);

                return {
                    success: true,
                    message: 'Webhook endpoint is accessible',
                    url: webhookUrl,
                    response: response.data
                };
            } else {
                console.warn(`✗ Webhook test returned unexpected response: ${webhookUrl}`);

                return {
                    success: false,
                    message: 'Webhook endpoint returned unexpected response',
                    url: webhookUrl,
                    status: response.status
                };
            }
        } catch (error) {
            // Проверяем тип ошибки
            if (error.code === 'ECONNREFUSED') {
                console.error(`✗ Webhook test FAILED: Connection refused (${webhookUrl})`);
                console.error('  Local server may not be started or port is blocked');
            } else if (error.code === 'ETIMEDOUT') {
                console.error(`✗ Webhook test FAILED: Timeout (${webhookUrl})`);
                console.error('  Request timed out - check nginx/network configuration');
            } else if (error.response) {
                console.error(`✗ Webhook test FAILED: HTTP error (${webhookUrl})`);
                console.error(`  Status: ${error.response.status} ${error.response.statusText}`);
            } else {
                console.error(`✗ Webhook test FAILED: Unknown error (${webhookUrl})`);
                console.error(`  Error: ${error.message}`);
            }

            return {
                success: false,
                message: error.message,
                url: webhookUrl,
                error: {
                    code: error.code,
                    message: error.message
                }
            };
        }
    }

    /**
     * Тестирует webhook endpoint при запуске приложения
     * Использует WEBHOOK_DOMAIN из конфига или тестирует локально
     */
    async testOnStartup() {
        console.log('=== Starting webhook connectivity test ===');

        const results = [];

        // 1. Всегда тестируем локальный endpoint
        const localUrl = `http://localhost:${config.WEBHOOK_PORT}/bot/webhook`;
        const localResult = await this.testWebhook(localUrl);
        results.push({ type: 'local', ...localResult });

        // 2. Если указан WEBHOOK_DOMAIN, тестируем внешний URL
        if (config.WEBHOOK_DOMAIN) {
            // Убираем trailing slash если есть
            const domain = config.WEBHOOK_DOMAIN.replace(/\/$/, '');
            const path = config.WEBHOOK_PATH || '/bot/webhook';
            const externalUrl = `${domain}${path}`;

            const externalResult = await this.testWebhook(externalUrl);
            results.push({ type: 'external', ...externalResult });
        } else {
            console.log('WEBHOOK_DOMAIN not configured - skipping external webhook test');
        }

        // Суммарный результат
        const allSuccessful = results.every(r => r.success);
        const someSuccessful = results.some(r => r.success);

        console.log('=== Webhook connectivity test results ===');
        results.forEach(r => {
            console.log(`  [${r.type}] ${r.url}: ${r.success ? '✓ SUCCESS' : '✗ FAILED'}`);
        });

        if (allSuccessful) {
            console.log('✓ All webhook endpoints are accessible');
        } else if (someSuccessful) {
            console.warn('⚠ Some webhook endpoints are not accessible');
        } else {
            console.error('✗ All webhook endpoints are NOT accessible');
        }

        return {
            allSuccessful,
            someSuccessful,
            results
        };
    }

    /**
     * Проверяет готовность к миграции на webhook
     */
    async checkMigrationReadiness() {
        console.log('--- Checking migration readiness ---');

        const checks = {
            webhookDomainConfigured: !!config.WEBHOOK_DOMAIN,
            webhookPathConfigured: !!config.WEBHOOK_PATH,
            localEndpointAccessible: false,
            externalEndpointAccessible: false
        };

        // Тест локального endpoint
        const localUrl = `http://localhost:${config.WEBHOOK_PORT}/bot/webhook`;
        const localResult = await this.testWebhook(localUrl);
        checks.localEndpointAccessible = localResult.success;

        // Тест внешнего endpoint (если настроен)
        if (config.WEBHOOK_DOMAIN) {
            const domain = config.WEBHOOK_DOMAIN.replace(/\/$/, '');
            const path = config.WEBHOOK_PATH || '/bot/webhook';
            const externalUrl = `${domain}${path}`;

            const externalResult = await this.testWebhook(externalUrl);
            checks.externalEndpointAccessible = externalResult.success;
        }

        // Определяем готовность
        const isReady =
            checks.webhookDomainConfigured &&
            checks.webhookPathConfigured &&
            checks.localEndpointAccessible &&
            checks.externalEndpointAccessible;

        if (isReady) {
            console.log('✓ Bot is READY for webhook migration!');
            console.log('💡 To migrate: set BOT_MODE=webhook in .env and restart');
        } else {
            console.warn('⚠ Bot is NOT ready for webhook migration');
            if (!checks.webhookDomainConfigured) {
                console.warn('  - WEBHOOK_DOMAIN is not configured in .env');
            }
            if (!checks.localEndpointAccessible) {
                console.warn('  - Local webhook endpoint is not accessible');
            }
            if (!checks.externalEndpointAccessible) {
                console.warn('  - External webhook endpoint is not accessible');
            }
        }

        return {
            isReady,
            checks
        };
    }
}

export default new WebhookTester();
