/**
 * Test script for Discord thread message functionality
 * 
 * This script demonstrates how to use the sendMessageToThread function
 * to create threads from messages and send messages to them.
 * 
 * Usage:
 *   node scripts/test-thread-message.js <channelId> <messageId> [threadName] <message>
 * 
 * Example:
 *   node scripts/test-thread-message.js 123456789012345678 987654321098765432 "Discussion Thread" "This is a reply in a thread"
 * 
 * API Reference: https://discord.com/developers/docs/resources/channel#create-message
 */

import { sendMessageToThread } from '../src/plugins/shared/discordUtils.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    // Get arguments from command line
    const [, , channelId, messageId, ...rest] = process.argv;

    // Check if we have a thread name (in quotes) or not
    let threadName, message;

    // If the first element of rest starts with a quote, treat it as thread name
    if (rest.length > 1) {
        // Extract the thread name by joining elements until we find one that ends with a quote
        const threadNameParts = [];
        let i = 0;
        while (i < rest.length) {
            threadNameParts.push(rest[i]);
            if (rest[i].endsWith('"')) {
                i++;
                break;
            }
            i++;
        }

        // Process the thread name (remove quotes)
        threadName = threadNameParts[0];
        message = rest[1];
    } else {
        // No thread name provided, use default
        threadName = null;
        message = rest.join(' ');
    }

    // Check if required parameters are provided
    if (!channelId || !messageId || !message) {
        console.error('Usage: node scripts/test-thread-message.js <channelId> <messageId> [threadName] <message>');
        console.error('Example: node scripts/test-thread-message.js 123456789012345678 987654321098765432 "Discussion Thread" "This is a reply in a thread"');
        process.exit(1);
    }

    console.log(`Channel ID: ${channelId}`);
    console.log(`Message ID: ${messageId}`);
    console.log(`Thread Name: ${threadName || '(default)'}`);
    console.log(`Message: ${message}`);
    console.log(`Sending message to thread...`);

    try {
        // Send the message to the thread (creating it if needed)
        const result = await sendMessageToThread(
            messageId,
            channelId,
            threadName,
            message,
            {
                createIfNotExist: true,
                files: null // Optional - for sending file attachments
            }
        );

        if (result.success) {
            console.log('Thread message sent successfully!');
            console.log(`Thread ID: ${result.thread.id}`);
            console.log(`Thread Name: ${result.thread.name}`);
            console.log(`Sent ${result.messages.length} message chunks`);
        } else {
            console.error('Failed to send thread message:', result.error);
            process.exit(1);
        }
    } catch (error) {
        console.error('Unhandled error:', error);
        process.exit(1);
    }
}

// Run the main function
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
}); 