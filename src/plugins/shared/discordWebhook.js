/**
 * Discord Webhook Utilities
 * Provides functionality to send messages to Discord channels via webhooks
 */

// For making HTTP requests to webhook URLs
import axios from 'axios';

/**
 * Mapping of channel numbers to webhook information
 * Each entry contains the webhook URL and a display name for the channel
 */
const webhookMap = {
    // Example mappings - replace with your actual webhook URLs
    "x": {
        url: "https://discord.com/api/webhooks/1350989789737783457/XmvS6bzqPCXo41W-C0nCn73p_Eyy4OMM6_T8lVNb2Aus1AhuQKlWm23QeF8eBcU-48RB",
        name: 'x-summary'
    },
    "discord": {
        url: "https://discord.com/api/webhooks/1350989950417375252/tQHUIaQ20S7UAxp5fbCgS0wvVIun9aJ9_AqNvDKiuCXbr-5vmpAY6rAlOFLopKS5Cqum",
        name: 'discord-summary'
    },
    "telegram": {
        url: "https://discord.com/api/webhooks/1350990088976203939/B2TLDU431PFvbs6xWbCfP8LUUnOr-X7JTa14ytrBMp8h3Enp5eR0PumWoreIWhkfQasM",
        name: 'telegram-summary'
    },
    "chart": {
        url: "https://discord.com/api/webhooks/1350990285919748138/1K3nofraXALOm2MFJf1RrfoO8DMjEirIacRYpDX4mxtud-8IxyDWMnupxA-MMvEmTT-Q",
        name: 'chart-summary'
    },
    "test-3": {
        url: "https://discord.com/api/webhooks/1350648523883941959/aOK0UFTgNi1Cw8oDJD-o84feO4DniactTnLDt4ug6d8GmwQtOpmNE6ruhQDvmgGcPl-A",
        name: 'test-3'
    },
    "videos": {
        url: "https://discord.com/api/webhooks/1351201976255512687/D78Cux3FW7PZHTSU5rpRr63mJpnlF-zF1037lv73_1XuQBTs7YIpAeRJqGgG8wnIdrCG",
        name: 'video-explain'
    }
};

/**
 * Splits a message into chunks that fit within Discord's message length limit
 * @param {string} content - The message content to split
 * @param {number} maxLength - Maximum length of each chunk
 * @returns {Array<string>} - Array of message chunks
 */
function splitMessage(content, maxLength = 2000) {
    if (typeof content !== 'string') return [''];
    if (content.length <= maxLength) return [content];

    const chunks = [];
    let currentChunk = '';

    // Split by newlines first to preserve formatting when possible
    const lines = content.split('\n');

    for (const line of lines) {
        // If the line itself is too long, split it
        if (line.length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = '';
            }

            let remainingLine = line;
            while (remainingLine.length > 0) {
                const chunk = remainingLine.slice(0, maxLength);
                chunks.push(chunk);
                remainingLine = remainingLine.slice(maxLength);
            }
        }
        // Otherwise check if adding this line would exceed the max length
        else if (currentChunk.length + line.length + 1 > maxLength) {
            chunks.push(currentChunk);
            currentChunk = line;
        }
        // Add the line to the current chunk
        else {
            if (currentChunk) {
                currentChunk += '\n' + line;
            } else {
                currentChunk = line;
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

/**
 * Sends a message to a Discord channel via webhook
 * @param {number|string} webhookId - The channel number from the webhook map
 * @param {string} senderName - Name to display as the message sender
 * @param {string} message - Content of the message to send
 * @param {Object} options - Additional options like avatar URL, embeds, etc.
 * @returns {Promise<Object[]>} - Array of response objects from the webhook
 */
export async function sendWebhookMessage(webhookId, senderName, message, options = {}) {
    // Get webhook info from the map
    const webhookInfo = webhookMap[webhookId];

    if (!webhookInfo || !webhookInfo.url) {
        console.error(`Webhook not found for ID: ${webhookId}`);
        return [];
    }

    try {
        // Split message if needed
        const MAX_MESSAGE_LENGTH = 2000;
        const messageChunks = splitMessage(message, MAX_MESSAGE_LENGTH);
        const responses = [];

        // Send each chunk as a separate message
        for (const chunk of messageChunks) {
            if (chunk.trim().length === 0) continue;

            const webhookData = {
                content: chunk,
                username: senderName || 'ElizaOS Bot',
                ...options
            };

            const response = await axios.post(webhookInfo.url, webhookData);
            responses.push(response.data);
        }

        return responses;
    } catch (error) {
        console.error(`Error sending webhook message to ${webhookInfo.name}:`, error);
        return [];
    }
}

/**
 * Get the list of available webhook channels
 * @returns {Object} - Object with channel IDs as keys and channel names as values
 */
export function getAvailableWebhooks() {
    const available = {};

    for (const [id, info] of Object.entries(webhookMap)) {
        if (info.url) {
            available[id] = info.name;
        }
    }

    return available;
}

/**
 * Dynamically manages webhooks for a Discord channel and sends messages
 * @param {string} channelId - The Discord channel ID to send message to
 * @param {string} senderName - Name to display as the message sender
 * @param {string} message - Content of the message to send
 * @param {string} botToken - Discord bot token with webhook management permissions
 * @param {Object} options - Additional options for the webhook message
 * @param {string} [options.avatarUrl] - URL for the webhook avatar
 * @param {string} [options.applicationId] - Application ID to identify webhooks
 * @param {string} [options.threadId] - Thread ID to send message to (if targeting a thread)
 * @param {Object} [options.allowedMentions] - Controls what mentions are parsed
 * @returns {Promise<Object[]>} - Array of response objects from the webhook
 */
export async function sendDynamicWebhookMessage(channelId, senderName, message, botToken, options = {}) {
    if (!channelId || !botToken) {
        console.error('Channel ID and bot token are required for dynamic webhooks');
        return [];
    }

    try {
        // Get existing webhooks for the channel
        const webhooksResponse = await axios.get(
            `https://discord.com/api/v10/channels/${channelId}/webhooks`,
            {
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let webhook;
        const webhooks = webhooksResponse.data;

        // Look for an existing webhook created by our bot
        webhook = webhooks.find(hook =>
            hook.name === 'ElizaOS Dynamic Webhook' &&
            hook.application_id === (options.applicationId || 'ElizaOS')
        );

        // Create a new webhook if none exists
        if (!webhook) {
            const createResponse = await axios.post(
                `https://discord.com/api/v10/channels/${channelId}/webhooks`,
                {
                    name: 'ElizaOS Dynamic Webhook',
                    avatar: options.avatarUrl // Avatar provided during webhook creation
                },
                {
                    headers: {
                        'Authorization': `Bot ${botToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            webhook = createResponse.data;
        }

        // Now send the message using the webhook
        const MAX_MESSAGE_LENGTH = 2000;
        const messageChunks = splitMessage(message, MAX_MESSAGE_LENGTH);
        const responses = [];

        // Send each chunk as a separate message
        for (const chunk of messageChunks) {
            if (chunk.trim().length === 0) continue;

            const webhookData = {
                content: chunk,
                username: senderName || 'ElizaOS Bot',
                avatar_url: options.avatarUrl,
                allowed_mentions: options.allowedMentions, // Control what mentions are parsed
                thread_id: options.threadId, // Support for sending to threads
                ...options
            };

            // Clean up options object to avoid duplicate parameters
            delete webhookData.avatarUrl;
            delete webhookData.applicationId;
            delete webhookData.allowedMentions;
            delete webhookData.threadId;

            // Build webhook URL, adding thread_id as a query parameter if specified
            let webhookUrl = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;

            // Use the webhook URL with token
            const response = await axios.post(webhookUrl, webhookData);
            responses.push(response.data);
        }

        return responses;
    } catch (error) {
        console.error(`Error with dynamic webhook for channel ${channelId}:`, error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`);
        }
        return [];
    }
}

export default {
    sendWebhookMessage,
    getAvailableWebhooks,
    sendDynamicWebhookMessage,
    webhookMap
}; 