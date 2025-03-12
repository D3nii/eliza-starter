/**
 * DiscordHistoryPlugin Class for ElizaOS
 * A reusable plugin class for creating Discord history fetching plugins with custom parameters
 */

// Import shared Discord utilities
import {
    initializeClient,
    formatMessageHistory,
    processWithAI,
    sendDiscordMessage,
    fetchDiscordHistory
} from './discordUtils.js';

// Import shared time utilities
import { parseTimeCommand } from './timeUtils.js';

export class DiscordHistoryPlugin {
    /**
     * Create a new Discord history plugin
     * @param {Object} config Configuration for the plugin
     * @param {string} config.pluginName The name of the plugin (e.g., "Tweetz", "DiscordFetcher")
     * @param {string} config.commandPrefix The command prefix for the plugin (e.g., "tweetz run on", "fetch discord history for")
     * @param {RegExp} config.timePattern The regex pattern for extracting time periods
     * @param {string[]} config.sourceChannelIDs Array of Discord channel IDs to fetch messages from
     * @param {string} config.targetChannelId Discord channel ID to send responses to
     * @param {string} config.defaultPrompt Custom prompt for the AI
     * @param {number} config.maxMessages Maximum number of messages to fetch
     * @param {string[]} config.similes Array of similar action names
     * @param {string} config.description Description of the plugin
     */
    constructor(config) {
        this.pluginName = config.pluginName || "DiscordHistory";
        this.commandPrefix = config.commandPrefix || "";
        this.timePattern = config.timePattern;
        this.sourceChannelIDs = config.sourceChannelIDs || [];
        this.targetChannelId = config.targetChannelId;
        this.defaultPrompt = config.defaultPrompt || "Analyze the Discord conversation and provide a summary of the conversation. Be sure to include all the details of the conversation, including the names of the people involved and the content of the messages. \n\n{{messages}}";
        this.maxMessages = config.maxMessages || 10000;
        this.similes = config.similes || [];
        this.description = config.description || "Fetches Discord message history";

        // Initialize the Discord client
        initializeClient();

        // Create the action name (uppercase with underscores)
        this.actionName = `${this.pluginName.toUpperCase()}_MESSAGE_HISTORY`;

        // Build the actions and evaluators
        this.actions = this.buildActions();
        this.evaluators = [];
    }

    /**
     * Build the actions for this plugin
     * @returns {Array} Array of action objects
     */
    buildActions() {
        const historyAction = {
            name: this.actionName,
            similes: this.similes,
            description: this.description,
            pattern: this.timePattern,

            validate: async (runtime, message, _state) => {
                try {
                    // Skip if there's no text content
                    if (!message.content?.text) {
                        return false;
                    }

                    const text = message.content.text.toLowerCase().trim();

                    // Check if the message matches our pattern
                    if (this.timePattern.test(text)) {
                        return true;
                    }

                    return false;
                } catch (error) {
                    console.error(`Error in ${this.actionName} validate:`, error);
                    return false;
                }
            },

            handler: async (runtime, message, state, options, callback) => {
                try {
                    console.log(`*** ${this.actionName} handler triggered ***`);

                    // Send an initial response
                    const initialResponse = {
                        text: `${this.pluginName} is fetching Discord message history... This might take a moment.`,
                        action: `${this.pluginName.toUpperCase()}_HISTORY_RESPONSE`,
                        source: message.content?.source || "unknown"
                    };

                    try {
                        await callback(initialResponse);
                        console.log("Sent initial response");
                    } catch (callbackError) {
                        console.error("Error sending initial response:", callbackError);
                    }

                    // Parse the time period from the message using shared utility
                    const timePeriod = parseTimeCommand(message.content.text, this.timePattern);
                    console.log(`${this.pluginName}: Parsed time period: ${timePeriod.display} (${timePeriod.hours} hours)`);

                    // Fetch the message history from all source channels
                    let allMessages = [];
                    for (const channelId of this.sourceChannelIDs) {
                        const channelMessages = await fetchDiscordHistory(
                            message,
                            timePeriod.hours,
                            channelId,
                            runtime,
                            this.maxMessages
                        );
                        console.log(`${this.pluginName}: Fetched ${channelMessages.length} messages from channel ${channelId}`);
                        allMessages = allMessages.concat(channelMessages);
                    }
                    console.log(`${this.pluginName}: Fetched ${allMessages.length} messages in total`);

                    // Format the message history
                    const formattedMessages = formatMessageHistory(allMessages);

                    // Process with AI if needed
                    let finalResponse = formattedMessages;
                    console.log(`${this.pluginName}: Processing with AI...`);
                    try {
                        const aiResponse = await processWithAI(
                            formattedMessages,
                            runtime,
                            this.defaultPrompt
                        );
                        if (aiResponse) {
                            finalResponse = aiResponse;
                        }
                    } catch (aiError) {
                        console.error(`${this.pluginName}: Error processing with AI:`, aiError);
                    }

                    // Prepare the final response text
                    const finalResponseText = `Here's the ${this.pluginName} message history analysis for the last ${timePeriod.display}:\n\n${finalResponse}`;

                    // Prepare the formatted response
                    const response = {
                        text: `# ${this.pluginName} History Summary (${timePeriod.display})\n\n${finalResponse}`,
                        action: `${this.pluginName.toUpperCase()}_HISTORY_RESPONSE`,
                        source: message.content?.source || "unknown"
                    };

                    // If message is not from Discord, send the response to the target channel
                    if (message.content?.source !== "discord" && this.targetChannelId) {
                        console.log(`${this.pluginName}: Sending response to target channel:`, this.targetChannelId);
                        await sendDiscordMessage(finalResponseText, this.targetChannelId);
                    }

                    await callback(response);
                    return response;
                } catch (error) {
                    console.error(`Error in ${this.actionName} handler:`, error);

                    // Send an error response
                    const errorResponse = {
                        text: `Error fetching ${this.pluginName} history: ${error.message}`,
                        action: `${this.pluginName.toUpperCase()}_HISTORY_RESPONSE`,
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
                            text: `${this.commandPrefix} 1d`
                        }
                    },
                    {
                        user: "Eliza",
                        content: {
                            text: `Here's the ${this.pluginName} message history for the last 1d...`
                        }
                    }
                ]
            ]
        };

        return [historyAction];
    }

    /**
     * Get the plugin object to export
     * @returns {Object} The plugin object
     */
    getPlugin() {
        return {
            name: `${this.pluginName} Plugin`,
            description: this.description,
            evaluators: this.evaluators,
            actions: this.actions,
            providers: []
        };
    }
} 