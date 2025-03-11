/**
 * Tweetz Plugin for ElizaOS
 * This plugin allows fetching Discord message history with custom "Tweetz run on [time period]" command
 */

// Import shared Discord utilities
import {
    initializeClient,
    formatMessageHistory,
    processWithAI,
    sendDiscordMessage,
    fetchDiscordHistory
} from '../../shared/discordUtils.js';

// Import shared time utilities
import { parseTimeCommand } from '../../shared/timeUtils.js';

// Configuration for the message history feature
const config = {
    // Maximum number of messages to fetch
    maxMessages: 10000,
    sourceChannelIDs: [
        "1346515144263467078",
        "1346515318453047396",
        "1346515484987887617",
        "1346515651136716830",
        "1346515829553893377",
        "1346516032847614103",
        "1346516168424558635",
        "1346516426382381066",
        "1346516839278186647",
        "1346517024058380338",
        "1346517146921861140",
        "1346517338299695214",
        "1346517450845585523",
        "1346517576309538826",
        "1346517693846786109",
        "1346517816831905942",
        "1346517943403679836",
        "1346518073095753811",
        "1346518183124668447",
        "1346518347222618142",
        "1346518455901225020",
        "1346518583949394093",
        "1346518701180063845",
        "1346518851159982142",
        "1346519205968609281",
        "1346519343256703117",
        "1346519500643893359",
        "1346519656017559653",
        "1346519842051854416",
        "1346519969051185254",
        "1346520115625197608",
        "1346520241571758212",
        "1346520363747770530",
        "1346520619667296429",
        "1346520743382482944",
        "1346520864686080060",
        "1347656441586258000",
        "1347676274834804776",
        "1347676349346873385"
    ],
    targetChannelId: "1349009989892833360",
    defaultPrompt: "Analyze the Discord conversation and provide a summary of the conversation. Be sure to include all the details of the conversation, including the names of the people involved and the content of the messages. \n\n{{messages}}"
};

// Pattern for extracting time periods from Tweetz commands
const tweetzTimePattern = /tweetz\s+run\s+on\s+(\d+[hdwm]|[124]\s*h|[124]\s*hour|[124]\s*hours|[1-7]\s*d|[1-7]\s*day|[1-7]\s*days|[1-4]\s*w|[1-4]\s*week|[1-4]\s*weeks|[1-3]\s*month|[1-3]\s*months)/i;

// Make sure the client is initialized
initializeClient();

// Discord Message History Action
export const tweetzHistoryAction = {
    name: "TWEETZ_MESSAGE_HISTORY",
    similes: [
        "TWEETZ_HISTORY",
        "MESSAGE_HISTORY",
        "CHAT_HISTORY",
        "FETCH_MESSAGES"
    ],
    description: "Fetches Discord message history with 'Tweetz run on [time period]' command",
    pattern: tweetzTimePattern,

    validate: async (runtime, message, _state) => {
        console.log("TWEETZ_MESSAGE_HISTORY validate called with message:", JSON.stringify(message, null, 2));
        try {
            // Skip if there's no text content
            if (!message.content?.text) {
                console.log("No text content in message");
                return false;
            }

            const text = message.content.text.toLowerCase().trim();
            console.log("Processing text:", text);

            // Check if the message matches our pattern "Tweetz run on X"
            const isTweetzCommand = /tweetz\s+run\s+on\s+/i.test(text);

            if (isTweetzCommand) {
                console.log("Tweetz command detected");
                return true;
            }

            console.log("Message doesn't match Tweetz command criteria");
            return false;
        } catch (error) {
            console.error("Error in TWEETZ_MESSAGE_HISTORY validate:", error);
            return false;
        }
    },

    handler: async (runtime, message, state, options, callback) => {
        try {
            console.log("*** TWEETZ_MESSAGE_HISTORY handler triggered ***");

            // Send an initial response
            const initialResponse = {
                text: "Tweetz is fetching Discord message history... This might take a moment.",
                action: "TWEETZ_HISTORY_RESPONSE",
                source: message.content?.source || "unknown"
            };

            try {
                await callback(initialResponse);
                console.log("Sent initial response");
            } catch (callbackError) {
                console.error("Error sending initial response:", callbackError);
            }

            // Parse the time period from the message using shared utility
            const timePeriod = parseTimeCommand(message.content.text, tweetzTimePattern);
            console.log(`Tweetz: Parsed time period: ${timePeriod.display} (${timePeriod.hours} hours)`);

            // Fetch the message history from all source channels
            let allMessages = [];
            for (const channelId of config.sourceChannelIDs) {
                const channelMessages = await fetchDiscordHistory(message, timePeriod.hours, channelId, runtime, config.maxMessages);
                console.log(`Tweetz: Fetched ${channelMessages.length} messages from channel ${channelId}`);
                allMessages = allMessages.concat(channelMessages);
            }
            console.log(`Tweetz: Fetched ${allMessages.length} messages in total`);

            // Format the message history
            const formattedMessages = formatMessageHistory(allMessages);

            // Process with AI if needed
            let finalResponse = formattedMessages;
            console.log("Tweetz: Processing with AI...");
            try {
                const aiResponse = await processWithAI(formattedMessages, runtime, config.defaultPrompt);
                if (aiResponse) {
                    finalResponse = aiResponse;
                }
            } catch (aiError) {
                console.error("Tweetz: Error processing with AI:", aiError);
            }

            // Prepare the final response
            const finalResponseText = `Here's the Discord message history analysis for the last ${timePeriod.display}:\n\n${finalResponse}`;

            // Prepare the final response
            const response = {
                text: `# Discord History Summary (${timePeriod.display})\n\n${finalResponse}`,
                action: "TWEETZ_HISTORY_RESPONSE",
                source: message.content?.source || "unknown"
            };

            // If messages is not from Discord, send the response to the target channel
            if (message.content?.source !== "discord") {
                console.log("Tweetz: Sending response to target channel:", config.targetChannelId);
                await sendDiscordMessage(finalResponseText, config.targetChannelId);
            }

            await callback(response);
            return response;
        } catch (error) {
            console.error("Error in TWEETZ_MESSAGE_HISTORY handler:", error);

            // Send an error response
            const errorResponse = {
                text: `Error fetching Discord history: ${error.message}`,
                action: "TWEETZ_HISTORY_RESPONSE",
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
                    text: "Tweetz run on 1d"
                }
            },
            {
                user: "Eliza",
                content: {
                    text: "Here's the Discord message history for the last 1d..."
                }
            }
        ]
    ]
};

// Export the actions and evaluators
export const actions = [tweetzHistoryAction];
export const evaluators = [];
