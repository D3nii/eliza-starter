/**
 * Custom Discord Plugin for ElizaOS
 * This plugin allows fetching Discord message history for different time periods
 */

// Import Discord.js
import { Client, GatewayIntentBits, Partials } from 'discord.js';


// Import ElizaOS core functions
import { generateText, composeContext, ModelClass } from '@elizaos/core';


// Configuration for the message history feature
const config = {
    // Default time periods in hours
    timePeriods: {
        '4h': 4,
        '1d': 24,
        '1w': 168,     // 7 days * 24 hours
        '1month': 720  // ~30 days * 24 hours
    },
    // Maximum number of messages to fetch
    maxMessages: 10000,
    sourceChannelIDs: [
        "1345157213123121182",
        "1347292341316096061"
    ],
    targetChannelId: "1345062534125719562",
    defaultPrompt: "Analyze the Discord conversation and provide a summary of the conversation. Be sure to include all the details of the conversation, including the names of the people involved and the content of the messages. \n\n{{messages}}"
};

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
const initializeClient = async () => {
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
 * Helper function to parse the time period from the command
 * @param {string} text - The command text
 * @returns {number|null} - Hours to look back, or null if invalid
 */
function parseTimePeriod(text) {
    const lowerText = text.toLowerCase().trim();

    // Check for specific time periods
    for (const [period, hours] of Object.entries(config.timePeriods)) {
        if (lowerText.includes(period)) {
            return { hours, display: period };
        }
    }

    // Default to 24 hours (1 day) if no specific period is mentioned
    return { hours: config.timePeriods['1d'], display: '1d' };
}

/**
 * Format the message history into a format suitable for AI input
 * @param {Array} messages - Array of Discord messages
 * @returns {string} - Formatted message history
 */
function formatMessageHistory(messages) {
    if (!messages || messages.length === 0) {
        return "No messages found in the specified time period.";
    }

    // Sort messages by timestamp (oldest first)
    const sortedMessages = [...messages].sort((a, b) =>
        a.createdTimestamp - b.createdTimestamp
    );

    // Format as a simple conversation transcript
    let output = "Discord Conversation:\n\n";

    // Track the current thread to add headers
    let currentThreadName = null;

    sortedMessages.forEach(msg => {
        const username = msg.author?.username || 'Unknown User';
        const content = msg.content || '';

        // Check if this message is from a thread
        if (msg.threadName && msg.threadName !== currentThreadName) {
            // Add a thread header when we switch to a new thread
            currentThreadName = msg.threadName;
            output += `[THREAD: ${currentThreadName}]\n\n`;
        } else if (!msg.threadName && currentThreadName !== null) {
            // We're back to the main channel
            currentThreadName = null;
            output += `[MAIN CHANNEL]\n\n`;
        }

        // Simple format: Username: Message (without timestamp)
        output += `${username}: ${content}\n\n`;
    });

    return output;
}

/**
 * Process message history with ElizaOS AI
 * @param {string} formattedMessages - Formatted message history
 * @param {Object} runtime - ElizaOS runtime
 * @param {string} customPrompt - Optional custom prompt for the AI
 * @returns {Promise<string>} - AI response
 */
async function processWithAI(formattedMessages, runtime, customPrompt = null) {
    try {
        console.log("Processing messages with ElizaOS AI...");

        // Create the prompt for the AI
        const prompt = customPrompt || config.defaultPrompt;

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
 * Fetch message history from Discord
 * @param {Object} message - The triggering message
 * @param {number} hours - Hours to look back
 * @param {string} channelId - Discord channel ID
 * @param {Object} runtime - ElizaOS runtime
 * @returns {Promise<Array>} - Array of messages
 */
async function fetchDiscordHistory(message, hours, channelId, runtime) {
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

        // Use provided channelId or default to a specific channel
        const targetChannelId = channelId || config.sourceChannelIDs[0];

        console.log(`Fetching Discord history for channel ${targetChannelId} for the last ${hours} hours`);

        // Calculate the timestamp to fetch messages after
        const now = new Date();
        const lookbackTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

        // Fetch the channel
        const channel = await client.channels.fetch(targetChannelId);

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
        while (keepFetching && lastMessageId && allMessages.size < config.maxMessages) {
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
            if (allMessages.size >= config.maxMessages) {
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
                    if (allMessages.size >= config.maxMessages) break;

                    console.log(`Fetching messages from thread: ${thread.name}`);

                    // Fetch messages from this thread
                    const threadMessages = await thread.messages.fetch({ limit: 100 });

                    // Add thread messages to our collection if they're after the lookback time
                    threadMessages.forEach(msg => {
                        if (allMessages.size >= config.maxMessages) return;

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
                    if (allMessages.size >= config.maxMessages) break;

                    console.log(`Fetching messages from archived thread: ${thread.name}`);

                    // Fetch messages from this thread
                    const threadMessages = await thread.messages.fetch({ limit: 100 });

                    // Add thread messages to our collection if they're after the lookback time
                    threadMessages.forEach(msg => {
                        if (allMessages.size >= config.maxMessages) return;

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

// Discord Message History Action
export const discordHistoryAction = {
    name: "DISCORD_MESSAGE_HISTORY",
    similes: [
        "DISCORD_HISTORY",
        "MESSAGE_HISTORY",
        "CHAT_HISTORY",
        "FETCH_MESSAGES"
    ],
    description: "Fetches Discord message history for a specified time period (4h, 1d, 1w, 1month)",
    pattern: /(?:analyze|summarize|fetch|get|show|give me|what's in|look at).*(?:discord|conversation|chat|message|channel).*(?:history|messages|chat|conversation).*(?:from|for|in|over|during|the last|past)?\s*(?:(\d+)\s*(?:hour|hr|h|day|d|week|w|month|m)s?|(\d+)\s*(?:hour|hr|h|day|d|week|w|month|m)s?|(?:4h|1d|1w|1month))/i,

    validate: async (runtime, message, _state) => {
        try {
            // Skip if there's no text content
            if (!message.content?.text) {
                return false;
            }

            const text = message.content.text.toLowerCase().trim();

            if (text.toLowerCase().includes('big brains do the thing')) {
                console.log("Big Brains Do the thing");
                return true;
            }

            // Check if this is an analysis request
            const isAnalysisRequest = text.includes('analyze') ||
                text.includes('summarize') ||
                text.includes('summary') ||
                text.includes('process');

            // Check if Discord is mentioned (optional)
            const mentionsDiscord = text.includes('discord') ||
                text.includes('channel') ||
                text.includes('server');

            // Check if any time period is mentioned
            const hasTimePeriod = Object.keys(config.timePeriods).some(period =>
                text.includes(period)
            );

            // We'll be more lenient - if it's an analysis request with a time period, we'll handle it
            // even if Discord isn't explicitly mentioned
            const shouldHandle = isAnalysisRequest && (hasTimePeriod || text.includes('recent'));

            // If we should handle this, explicitly return true
            if (shouldHandle) {
                return true;
            }

            return false;
        } catch (error) {
            console.error("Error in DISCORD_ANALYZE validate:", error);
            return false;
        }
    },

    handler: async (runtime, message, state, options, callback) => {
        try {
            console.log("*** DISCORD_MESSAGE_HISTORY handler triggered ***");

            // If we received an empty state, make sure to compose it
            if (!state || Object.keys(state).length === 0) {
                console.log("No state provided, composing state");
                state = await runtime.composeState(message);
            }

            // Send an initial response
            const initialResponse = {
                text: "Fetching Discord message history... This might take a moment.",
                action: "DISCORD_HISTORY_RESPONSE",
                source: message.content?.source || "unknown"
            };

            try {
                await callback(initialResponse);
                console.log("Sent initial response");
            } catch (callbackError) {
                console.error("Error sending initial response:", callbackError);
            }

            // Parse the time period from the message
            const timePeriod = parseTimePeriod(message.content.text);

            // Fetch the message history from all source channels
            let allMessages = [];
            for (const channelId of config.sourceChannelIDs) {
                const channelMessages = await fetchDiscordHistory(message, timePeriod.hours, channelId, runtime);
                console.log(`Fetched ${channelMessages.length} messages from channel ${channelId}`);
                allMessages = allMessages.concat(channelMessages);
            }
            console.log(`Fetched ${allMessages.length} messages in total`);

            // Format the message history
            const formattedMessages = formatMessageHistory(allMessages);

            // Process with AI if needed
            let finalResponse = formattedMessages;
            console.log("Processing with AI...");
            try {
                const aiResponse = await processWithAI(formattedMessages, runtime);
                if (aiResponse) {
                    finalResponse = aiResponse;
                }
            } catch (aiError) {
                console.error("Error processing with AI:", aiError);
            }

            // Prepare the final response
            const finalResponseText = `Here's the Discord message history analysis for the last ${timePeriod.display}:\n\n${finalResponse}`;

            // Create the response object
            const response = {
                text: finalResponseText,
                action: "DISCORD_HISTORY_RESPONSE",
                source: message.content?.source || "unknown"
            };

            await callback(response);
            return response;
        } catch (error) {
            console.error("Error in DISCORD_MESSAGE_HISTORY handler:", error);

            // Send an error response
            const errorResponse = {
                text: "I encountered an error while fetching the Discord message history. Please try again later.",
                action: "DISCORD_HISTORY_RESPONSE",
                source: message.content?.source || "unknown"
            };

            try {
                await callback(errorResponse);
            } catch (callbackError) {
                console.error("Error sending error response:", callbackError);
            }

            return errorResponse;
        }
    },

    examples: [
        [
            {
                user: "User1",
                content: {
                    // text: "Analyze the Discord conversation from the last 1d"
                    text: "Big Brains Do the thing the last 1d of the conversation"
                }
            },
            {
                user: "Eliza",
                content: {
                    text: "Here's the Discord message history for the last 4 hours..."
                }
            }
        ]
    ]
};

// Export the actions and evaluators
export const actions = [discordHistoryAction];
export const evaluators = [];
