/**
 * Shared Discord utilities for ElizaOS plugins
 * These utilities can be imported and used by any plugin that interacts with Discord
 */

// Import Discord.js
import { Client, GatewayIntentBits, Partials } from 'discord.js';

// Import ElizaOS core functions
import { generateText, composeContext, ModelClass } from '@elizaos/core';

// Import shared utilities
import { parseTimeCommand } from './timeUtils.js';

// Create a Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel]
});

// Initialize the Discord client
let isClientReady = false;

client.once('ready', () => {
    console.log(`Discord client logged in as ${client.user.tag}`);
    isClientReady = true;
});

// Login to Discord with the token
export const initializeClient = async () => {
    if (!process.env.DISCORD_API_TOKEN) {
        console.error('DISCORD_API_TOKEN is not defined in environment variables');
        return false;
    }

    try {
        await client.login(process.env.DISCORD_API_TOKEN);
        return true;
    } catch (error) {
        console.error('Failed to login to Discord:', error);
        return false;
    }
};

// Initialize the client when the module is loaded
initializeClient();

/**
 * Format the message history into a JSON format with basic message info
 * @param {Array} messages - Array of Discord messages
 * @returns {Object} - JSON formatted message history
 */
export function formatMessageHistory(messages) {
    if (!messages || messages.length === 0) {
        return { messages: [] };
    }

    // Sort messages by timestamp (oldest first)
    const sortedMessages = [...messages].sort((a, b) =>
        a.createdTimestamp - b.createdTimestamp
    );

    // Format each message with only the required fields
    const formattedMessages = sortedMessages.map(msg => {
        // Get embed contents
        let embedContents = [];
        if (msg.embeds && msg.embeds.length > 0) {
            msg.embeds.forEach(embed => {
                let parts = [];
                if (embed.title) parts.push(embed.title);
                if (embed.description) parts.push(embed.description);
                if (embed.fields && embed.fields.length > 0) {
                    embed.fields.forEach(field => {
                        parts.push(`${field.name}: ${field.value}`);
                    });
                }
                if (parts.length > 0) {
                    embedContents.push(parts.join(' '));
                }
            });
        }

        // Combine main content with embeds
        let content = msg.content || '';
        if (embedContents.length > 0) {
            content += '\nembeds:' + embedContents.join('. ');
        }

        return {
            username: msg.author?.username || 'Unknown User',
            content: content,
            timestamp: new Date(msg.createdTimestamp).toISOString()
        };
    });

    // return { messages: formattedMessages };
    return JSON.stringify(formattedMessages, null, 2);
}

/**
 * Helper function to extract readable content from an embed
 * @param {Object} embed - Discord embed object
 * @returns {string|null} - Extracted content or null
 */
function extractEmbedContent(embed) {
    if (!embed) return null;

    let content = '';

    if (embed.title) content += `${embed.title}\n`;
    if (embed.description) content += `${embed.description}\n`;

    if (embed.fields && embed.fields.length > 0) {
        embed.fields.forEach(field => {
            content += `${field.name}: ${field.value}\n`;
        });
    }

    return content.trim() || null;
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Process message history with ElizaOS AI
 * @param {string} formattedMessages - Formatted message history
 * @param {Object} runtime - ElizaOS runtime
 * @param {string} customPrompt - Optional custom prompt for the AI
 * @returns {Promise<string>} - AI response
 */
export async function processWithAI(formattedMessages, runtime, customPrompt = null) {
    try {
        console.log("Processing messages with ElizaOS AI...");

        // Create the prompt for the AI
        const prompt = customPrompt || "Analyze the Discord conversation and provide a summary of the conversation. Be sure to include all the details of the conversation, including the names of the people involved and the content of the messages. \n\n{{messages}}";

        const context = composeContext({
            state: {
                messages: formattedMessages
            },
            // make sure it fits, we can pad the tokens a bit
            template: prompt
        });
        const summary = await generateText({
            runtime,
            context,
            modelClass: ModelClass.SMALL
        });
        return summary;
    } catch (error) {
        console.error("Error processing with AI:", error);
        return "Error: Unable to process messages with AI. Please check the logs for details.";
    }
}

/**
 * Send a message to a Discord channel with automatic chunking for long messages
 * @param {string|Object} content - The message content to send
 * @param {string} channelId - Discord channel ID
 * @param {Array} [files] - Optional array of file attachments
 * @returns {Promise<Array>} - Array of sent message objects
 */
export async function sendDiscordMessage(content, channelId, files = null) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        console.error("Channel not found:", channelId);
        return [];
    }

    try {
        // Define maximum Discord message length
        const MAX_MESSAGE_LENGTH = 2000;

        // Split the message into chunks if it's a string
        const messageText = typeof content === 'object' ? content.text || '' : content;
        const messages = splitMessage(messageText, MAX_MESSAGE_LENGTH);
        const sentMessages = [];

        // Send each chunk as a separate message
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            if (message.trim().length > 0 || (i === messages.length - 1 && files)) {
                const options = {
                    content: message.trim(),
                    allowedMentions: { parse: ['users', 'roles'], repliedUser: true, everyone: false },
                    ephemeral: false
                };

                // Add files to the last message chunk
                if (i === messages.length - 1 && files) {
                    options.files = files;
                }

                const sentMessage = await channel.send(options);
                sentMessages.push(sentMessage);
            }
        }

        return sentMessages;
    } catch (error) {
        console.error("Error sending Discord message:", error);
        return [];
    }
}

/**
 * Split a message into chunks that fit within Discord's message length limit
 * @param {string} content - The message content to split
 * @param {number} maxLength - Maximum length of each chunk
 * @returns {Array<string>} - Array of message chunks
 */
export function splitMessage(content, maxLength) {
    if (!content) return [''];

    const messages = [];
    let currentMessage = "";

    // Split by newlines first
    const rawLines = content.split("\n");

    // Process each line, further splitting if a line exceeds max length
    const lines = rawLines.flatMap(line => {
        const chunks = [];
        while (line.length > maxLength) {
            chunks.push(line.slice(0, maxLength));
            line = line.slice(maxLength);
        }
        chunks.push(line);
        return chunks;
    });

    // Combine lines into messages that fit within the limit
    for (const line of lines) {
        if (currentMessage.length + line.length + 1 > maxLength) {
            messages.push(currentMessage.trim());
            currentMessage = "";
        }
        currentMessage += line + "\n";
    }

    // Add the last message if it has content
    if (currentMessage.trim().length > 0) {
        messages.push(currentMessage.trim());
    }

    return messages;
}

/**
 * Fetch message history from Discord
 * @param {Object} message - The triggering message
 * @param {number} hours - Hours to look back
 * @param {string} channelId - Discord channel ID
 * @param {Object} runtime - ElizaOS runtime
 * @param {number} maxMessages - Maximum number of messages to fetch (default: 10000)
 * @returns {Promise<Array>} - Array of messages
 */
export async function fetchDiscordHistory(message, hours, channelId, runtime, maxMessages = 10000) {
    try {
        // Wait for client to be ready
        if (!isClientReady) {
            console.log("Discord client not ready, waiting...");
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (isClientReady) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 1000);

                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 10000);
            });
        }

        if (!isClientReady) {
            console.error("Discord client failed to initialize");
            return [];
        }

        console.log(`Fetching Discord history for channel ${channelId} for the last ${hours} hours`);

        // Calculate the timestamp to fetch messages after
        const now = new Date();
        const lookbackTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

        // Fetch the channel
        const channel = await client.channels.fetch(channelId);

        if (!channel || !channel.messages) {
            console.error("Invalid Discord channel or cannot fetch messages");
            return [];
        }

        // Use pagination to fetch messages
        let allMessages = new Map();
        let lastMessageId = null;
        let keepFetching = true;

        // First batch of messages
        let fetchedMessages = await channel.messages.fetch({ limit: 100 });

        // Add messages to our collection if they're after the lookback time
        fetchedMessages.forEach(msg => {
            if (new Date(msg.createdTimestamp) >= lookbackTime) {
                allMessages.set(msg.id, msg);
            }
        });

        // Get the ID of the last message for pagination
        lastMessageId = fetchedMessages.last()?.id;

        // Continue fetching until we reach the limit or run out of messages
        while (keepFetching && lastMessageId && allMessages.size < maxMessages) {
            console.log(`Fetched ${allMessages.size} messages so far, fetching more...`);

            // Fetch the next batch of messages
            fetchedMessages = await channel.messages.fetch({
                limit: 100,
                before: lastMessageId
            });

            // If no more messages, stop fetching
            if (fetchedMessages.size === 0) {
                keepFetching = false;
                continue;
            }

            // Add messages to our collection if they're after the lookback time
            let foundOlderThanLookback = false;

            fetchedMessages.forEach(msg => {
                const msgDate = new Date(msg.createdTimestamp);
                if (msgDate >= lookbackTime) {
                    allMessages.set(msg.id, msg);
                } else {
                    foundOlderThanLookback = true;
                }
            });

            // If we found messages older than our lookback time, stop fetching
            if (foundOlderThanLookback) {
                keepFetching = false;
                continue;
            }

            // Update the last message ID for the next iteration
            lastMessageId = fetchedMessages.last()?.id;

            // If we've reached our limit, stop fetching
            if (allMessages.size >= maxMessages) {
                keepFetching = false;
            }
        }

        // Fetch active threads in the channel
        if (channel.threads && typeof channel.threads.fetchActive === 'function') {
            try {
                console.log("Fetching active threads...");
                const activeThreads = await channel.threads.fetchActive();

                // For each thread, fetch messages
                for (const [threadId, thread] of activeThreads.threads) {
                    if (allMessages.size >= maxMessages) break;

                    console.log(`Fetching messages from thread: ${thread.name}`);

                    // Fetch messages from this thread
                    const threadMessages = await thread.messages.fetch({ limit: 100 });

                    // Add thread messages to our collection if they're after the lookback time
                    threadMessages.forEach(msg => {
                        if (allMessages.size >= maxMessages) return;

                        const msgDate = new Date(msg.createdTimestamp);
                        if (msgDate >= lookbackTime) {
                            // Add thread name to message content for context
                            msg.threadName = thread.name;
                            allMessages.set(msg.id, msg);
                        }
                    });
                }
            } catch (threadError) {
                console.error("Error fetching threads:", threadError);
            }
        }

        // Also try to fetch archived threads if possible
        if (channel.threads && typeof channel.threads.fetchArchived === 'function') {
            try {
                console.log("Fetching archived threads...");
                const archivedThreads = await channel.threads.fetchArchived();

                // For each archived thread, fetch messages
                for (const [threadId, thread] of archivedThreads.threads) {
                    if (allMessages.size >= maxMessages) break;

                    console.log(`Fetching messages from archived thread: ${thread.name}`);

                    // Fetch messages from this thread
                    const threadMessages = await thread.messages.fetch({ limit: 100 });

                    // Add thread messages to our collection if they're after the lookback time
                    threadMessages.forEach(msg => {
                        if (allMessages.size >= maxMessages) return;

                        const msgDate = new Date(msg.createdTimestamp);
                        if (msgDate >= lookbackTime) {
                            // Add thread name to message content for context
                            msg.threadName = thread.name;
                            allMessages.set(msg.id, msg);
                        }
                    });
                }
            } catch (threadError) {
                console.error("Error fetching archived threads:", threadError);
            }
        }

        console.log(`Finished fetching ${allMessages.size} messages (including thread messages)`);
        return Array.from(allMessages.values());
    } catch (error) {
        console.error("Error fetching Discord message history:", error);
        return [];
    }
}

// Export the client for direct access if needed
export const discordClient = client; 