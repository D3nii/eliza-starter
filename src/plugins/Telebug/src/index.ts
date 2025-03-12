/**
 * Telebug Plugin for ElizaOS
 * This plugin allows fetching Discord message history with a custom invocation pattern
 */

// Import the DiscordHistoryPlugin class
import { DiscordHistoryPlugin } from '../../shared/DiscordHistoryPlugin.js';

// Create the Telebug plugin with custom configuration
const telebugPlugin = new DiscordHistoryPlugin({
  pluginName: "Telebug",
  commandPrefix: "telebug run on",
  timePattern: /telebug\s+run\s+on\s+(\d+[hdwm]|[124]\s*h|[124]\s*hour|[124]\s*hours|[1-7]\s*d|[1-7]\s*day|[1-7]\s*days|[1-4]\s*w|[1-4]\s*week|[1-4]\s*weeks|[1-3]\s*month|[1-3]\s*months)/i,
  sourceChannelIDs: [
    "1346866771822514187",
    "1346866934968487966",
    "1346867031387148288",
    "1346867129059770459",
    "1346867232248172585",
    "1346867649111654471",
    "1346867851696537643",
    "1346868000657248329",
    "1347652885281767496"
  ],
  targetChannelId: "1349011247248707584",
  defaultPrompt: "Analyze the Discord conversation and provide a summary of the conversation. Be sure to include all the details of the conversation, including the names of the people involved and the content of the messages. \n\n{{messages}}",
  maxMessages: 10000,
  similes: [
    "TELEBUG_HISTORY",
    "MESSAGE_HISTORY",
    "CHAT_HISTORY",
    "FETCH_MESSAGES"
  ],
  description: "Fetches Discord message history with 'Telebug run on [time period]' command"
}).getPlugin();

var index_default = telebugPlugin;

export {
  index_default as default,
  telebugPlugin
}; 