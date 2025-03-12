/**
 * Quantfase Plugin for ElizaOS
 * This plugin allows fetching Discord message history with a custom invocation pattern
 */

// Import the DiscordHistoryPlugin class
import { DiscordHistoryPlugin } from '../../shared/DiscordHistoryPlugin.js';

// Create the Quantfase plugin with custom configuration
const quantfasePlugin = new DiscordHistoryPlugin({
  pluginName: "Quantfase",
  commandPrefix: "quantfase run on",
  timePattern: /quantfase\s+run\s+on\s+(\d+[hdwm]|[124]\s*h|[124]\s*hour|[124]\s*hours|[1-7]\s*d|[1-7]\s*day|[1-7]\s*days|[1-4]\s*w|[1-4]\s*week|[1-4]\s*weeks|[1-3]\s*month|[1-3]\s*months)/i,
  sourceChannelIDs: [
    "1349022831312371752"
  ],
  targetChannelId: "1349108063650451487",
  defaultPrompt: "Analyze the Discord conversation and provide a summary of the conversation. Be sure to include all the details of the conversation, including the names of the people involved and the content of the messages. \n\n{{messages}}",
  maxMessages: 10000,
  similes: [
    "QUANTFASE_HISTORY",
    "MESSAGE_HISTORY",
    "CHAT_HISTORY",
    "FETCH_MESSAGES"
  ],
  description: "Fetches Discord message history with 'Quantfase run on [time period]' command"
}).getPlugin();

var index_default = quantfasePlugin;

export {
  index_default as default,
  quantfasePlugin
}; 