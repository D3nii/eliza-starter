/**
 * Test script for dynamic Discord webhook functionality
 * 
 * This script demonstrates how to use the sendDynamicWebhookMessage function
 * to dynamically create and use webhooks for Discord channels.
 * 
 * Usage:
 *   node scripts/test-dynamic-webhook.js <channelId> <message>
 * 
 * API Reference: https://discord.com/developers/docs/resources/webhook
 */

import { sendDynamicWebhookMessage } from '../src/plugins/shared/discordWebhook.js';

async function main() {
    // Get arguments from command line
    const [, , channelId, ...messageParts] = process.argv;
    const message = messageParts.join(' ');

    // Check if required parameters are provided
    if (!channelId || !message) {
        console.error('Usage: node scripts/test-dynamic-webhook.js <channelId> <message>');
        console.error('Example: node scripts/test-dynamic-webhook.js 123456789012345678 "Hello, Discord!"');
        process.exit(1);
    }

    console.log(`Sending message to channel ${channelId}...`);

    try {
        // Send the message using the dynamic webhook function
        const result = await sendDynamicWebhookMessage(
            channelId,
            'ElizaOS Tester',
            message,
            {
                avatarUrl: 'https://i.imgur.com/AfFp7pu.png', // Example avatar URL
                // You can add more options here if needed
                threadId: null,                   // Optional - for sending to a thread in the channel
                allowedMentions: {                // Optional - control allowed mentions
                    parse: ['users', 'roles'],    // Types of mentions to parse
                    users: [],                    // List of user IDs to mention (empty = all)
                    roles: []                     // List of role IDs to mention (empty = all)
                }
            }
        );

        if (result.length > 0) {
            console.log('Message sent successfully!');
        } else {
            console.log('No response received. Message may not have been sent.');
        }
    } catch (error) {
        if (error.response) {
            // Handle Discord API errors
            const status = error.response.status;
            const message = error.response.data?.message || 'Unknown error';

            switch (status) {
                case 401:
                    console.error('Error: Invalid Discord token. Check your DISCORD_API_TOKEN.');
                    break;
                case 403:
                    console.error('Error: Bot lacks permissions to manage webhooks in this channel.');
                    break;
                case 404:
                    console.error('Error: Channel not found. Check your channel ID.');
                    break;
                case 429:
                    console.error('Error: Rate limited. Too many requests to Discord API.');
                    break;
                default:
                    console.error(`Discord API Error (${status}): ${message}`);
            }
        } else {
            console.error('Error sending message:', error.message);
        }
        process.exit(1);
    }
}

// Run the main function
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});